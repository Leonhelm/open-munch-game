import { Injectable } from '@angular/core';
import { Player, getCombatStrength, getClassCombatBonus } from '../models';
import { GameStateService } from '../engine/game-state.service';
import { EquipmentService } from '../engine/equipment.service';
import { GameState, MonsterCard } from '../models';

@Injectable({ providedIn: 'root' })
export class BotService {
  constructor(
    private readonly gameState: GameStateService,
    private readonly equipmentService: EquipmentService,
  ) {}

  playBotTurn(): void {
    const state = this.gameState.getState();
    if (!state) return;

    const player = state.players[state.currentPlayerIndex];
    if (!player || player.isHuman) return;

    this.equipBestItems(player, state);
    this.playUsefulCards(player);

    // Thief backstab: attempt on player with most cards
    this.tryThiefBackstab(state, player);

    switch (state.turnPhase) {
      case 'kick-door':
        this.handleKickDoor();
        break;
      case 'combat':
        this.handleCombat(state, player);
        break;
      case 'loot-room':
        this.gameState.lootRoom();
        this.handleCharity();
        break;
      case 'charity':
        this.handleCharity();
        break;
      default:
        this.gameState.endTurn();
    }
  }

  /**
   * Returns true if this bot should accept a help request from the current fighter.
   * Called externally (e.g. from game-board) when a human asks a bot for help.
   */
  decideBotHelp(botId: string): boolean {
    const state = this.gameState.getState();
    if (!state?.combat) return false;

    const bot = state.players.find(p => p.id === botId);
    if (!bot) return false;

    // Don't help if the bot is leading or nearly winning
    const leadingLevel = Math.max(...state.players.map(p => p.level));
    if (bot.level >= leadingLevel && bot.level >= 7) return false;

    // Don't help if the current fighter is the leader (let them struggle)
    const fighter = state.players[state.currentPlayerIndex]!;
    if (fighter.level >= leadingLevel && fighter.level >= 8) return false;

    // Don't help if we have fewer than 2 cards (can't contribute meaningfully)
    if (bot.hand.length < 2) return false;

    return true;
  }

  private handleKickDoor(): void {
    const card = this.gameState.kickDoor();
    if (!card) {
      this.gameState.endTurn();
      return;
    }

    const state = this.gameState.getState();
    if (!state) return;

    if (state.turnPhase === 'combat') {
      const player = state.players[state.currentPlayerIndex];
      if (player) this.handleCombat(state, player);
    } else if (state.turnPhase === 'loot-room') {
      this.gameState.lootRoom();
      this.handleCharity();
    } else {
      this.gameState.endTurn();
    }
  }

  private handleCombat(state: GameState, player: Player): void {
    if (!state.combat) return;

    const monster = state.combat.monster;
    let playerStr = this.calcPlayerCombatStr(state, player);
    const monsterStr = monster.level + state.combat.monsterBonuses;
    const margin = playerStr - monsterStr;

    // Early flee: if hopelessly outmatched and bad stuff is severe, don't waste resources
    if (margin <= -6 && this.isSevereBadStuff(monster)) {
      this.attemptEscape(player);
      const afterState = this.gameState.getState();
      if (afterState && afterState.turnPhase !== 'kick-door') {
        this.gameState.endTurn();
      }
      return;
    }

    // Try to ask for help if losing
    if (playerStr <= monsterStr) {
      this.tryAskForHelp(state, player, monsterStr);
      const newState = this.gameState.getState();
      if (newState) {
        playerStr = this.calcPlayerCombatStr(newState, newState.players[newState.currentPlayerIndex]!);
      }
    }

    // Use one-shot items if needed (minimal usage — only what's required to win)
    if (playerStr <= monsterStr) {
      this.useOneShotsIfNeeded(state, player, monsterStr);
      const newState = this.gameState.getState();
      if (newState) {
        playerStr = this.calcPlayerCombatStr(newState, newState.players[newState.currentPlayerIndex]!);
      }
    }

    // Warrior berserk: discard low-value cards for +1 if still losing
    if (playerStr <= monsterStr && player.className === 'warrior') {
      this.useWarriorBerserk(player, monsterStr);
      const newState = this.gameState.getState();
      if (newState) {
        playerStr = this.calcPlayerCombatStr(newState, newState.players[newState.currentPlayerIndex]!);
      }
    }

    // Evaluate: can we win?
    const latestState = this.gameState.getState();
    if (latestState) {
      const finalPlayerStr = this.calcPlayerCombatStr(latestState, latestState.players[latestState.currentPlayerIndex]!);
      const finalMonsterStr = monster.level + (latestState.combat?.monsterBonuses ?? 0);

      if (finalPlayerStr > finalMonsterStr) {
        this.gameState.resolveCombat();
      } else {
        this.attemptEscape(latestState.players[latestState.currentPlayerIndex]!);
      }
    }

    const afterState = this.gameState.getState();
    if (afterState && afterState.turnPhase !== 'kick-door') {
      this.gameState.endTurn();
    }
  }

  private attemptEscape(player: Player): void {
    // Wizard charm: prefer auto-escape if bad stuff is severe and have enough cards
    const state = this.gameState.getState();
    if (!state?.combat) return;
    if (player.className === 'wizard' && this.isSevereBadStuff(state.combat.monster) && player.hand.length >= 3) {
      const cardIds = player.hand.slice(0, 3).map(c => c.id);
      this.gameState.wizardCharm(cardIds);
    } else {
      this.gameState.runAway();
    }
  }

  private calcPlayerCombatStr(state: GameState, player: Player): number {
    if (!state.combat) return getCombatStrength(player);
    return this.gameState.getPlayerCombatStrength(state);
  }

  private isSevereBadStuff(monster: MonsterCard): boolean {
    const kind = monster.badStuffEffect.kind;
    return kind === 'lose-all-equipment' || kind === 'lose-hand' || kind === 'skip-turn'
      || (kind === 'lose-levels' && monster.badStuffEffect.levels >= 2);
  }

  private useWarriorBerserk(player: Player, monsterStr: number): void {
    // Sort hand by goldValue ascending to discard least valuable first
    const sortedHand = [...player.hand].sort((a, b) => {
      const aVal = 'goldValue' in a ? (a as { goldValue: number }).goldValue : 0;
      const bVal = 'goldValue' in b ? (b as { goldValue: number }).goldValue : 0;
      return aVal - bVal;
    });

    for (const card of sortedHand) {
      const state = this.gameState.getState();
      if (!state?.combat) break;
      const currentStr = this.calcPlayerCombatStr(state, state.players[state.currentPlayerIndex]!);
      if (currentStr > monsterStr) break;
      // Don't discard if it would leave us with < 2 cards
      const currentPlayer = state.players[state.currentPlayerIndex]!;
      if (currentPlayer.hand.length <= 2) break;
      this.gameState.warriorBerserk(card.id);
    }
  }

  private tryThiefBackstab(state: GameState, player: Player): void {
    if (player.className !== 'thief' || state.thiefBackstabUsed || state.turnPhase === 'combat') return;

    // Find player with most cards (not self), prefer non-leading players
    const targets = state.players
      .filter(p => p.id !== player.id && p.hand.length > 0)
      .sort((a, b) => b.hand.length - a.hand.length);

    if (targets.length > 0) {
      this.gameState.thiefBackstab(targets[0]!.id);
    }
  }

  private tryAskForHelp(state: GameState, player: Player, monsterStr: number): void {
    if (!state.combat || state.combat.helperId) return;

    const leadingLevel = Math.max(...state.players.map(p => p.level));

    // Find the best helper: strong enough to tip the balance, not the leader (unless tied)
    const candidates = state.players
      .filter(p => p.id !== player.id)
      .map(p => ({ player: p, strength: getCombatStrength(p) }))
      .filter(c => {
        // Don't ask a helper that is the sole leader (they won't benefit from helping us get stronger)
        const isLeader = c.player.level === leadingLevel &&
          state.players.filter(pp => pp.level === leadingLevel).length === 1;
        return !isLeader;
      })
      .sort((a, b) => b.strength - a.strength);

    for (const candidate of candidates) {
      const combinedStr = this.calcPlayerCombatStr(state, player) + candidate.strength;
      if (combinedStr > monsterStr) {
        this.gameState.askForHelp(candidate.player.id);
        return;
      }
    }
  }

  private equipBestItems(player: Player, state?: GameState): Player {
    let current = player;
    const currentMonster = state?.combat?.monster ?? null;

    // Sort by effective combat value (base bonus + applicable special effects)
    const equipmentCards = [...current.hand]
      .filter(c => c.type === 'equipment')
      .sort((a, b) => {
        const aVal = this.effectiveEquipmentValue(a as import('../models').EquipmentCard, currentMonster);
        const bVal = this.effectiveEquipmentValue(b as import('../models').EquipmentCard, currentMonster);
        return bVal - aVal;
      });

    for (const card of equipmentCards) {
      if (card.type === 'equipment' && this.equipmentService.canEquip(current, card)) {
        const currentBonus = this.equipmentService.getEquipmentBonus(current.equipment);
        const testResult = this.equipmentService.equip(current, card);
        const newBonus = this.equipmentService.getEquipmentBonus(testResult.player.equipment);
        if (newBonus > currentBonus) {
          this.gameState.playCardFromHand(card.id);
          const updatedState = this.gameState.getState();
          if (updatedState) current = updatedState.players[updatedState.currentPlayerIndex]!;
        }
      }
    }
    return current;
  }

  private effectiveEquipmentValue(card: import('../models').EquipmentCard, monster: import('../models').MonsterCard | null): number {
    let value = card.bonus;
    if (card.effect) {
      switch (card.effect.kind) {
        case 'bonus-vs-undead':
          // Count this bonus if we're currently fighting undead, or at half value speculatively
          value += monster?.undead ? card.effect.value : card.effect.value * 0.3;
          break;
        case 'run-bonus':
          // Small speculative value for run bonus (helps escape)
          value += card.effect.value * 0.5;
          break;
        case 'extra-treasure':
          // Extra treasures = extra cards = extra gold/levels, moderate value
          value += card.effect.value * 0.8;
          break;
      }
    }
    return value;
  }

  private playUsefulCards(player: Player): void {
    if (!player.className) {
      const classCard = player.hand.find(c => c.type === 'class');
      if (classCard) this.gameState.playCardFromHand(classCard.id);
    }

    if (!player.raceName) {
      const raceCard = player.hand.find(c => c.type === 'race');
      if (raceCard) this.gameState.playCardFromHand(raceCard.id);
    }

    for (const card of [...player.hand]) {
      if (card.type === 'level-up') {
        this.gameState.playCardFromHand(card.id);
      }
    }
  }

  private handleCharity(): void {
    const state = this.gameState.getState();
    if (!state) return;
    const player = state.players[state.currentPlayerIndex];
    if (!player) return;

    const limit = this.gameState.getHandLimit(player);
    const cardsToDiscard = [...player.hand]
      .sort((a, b) => {
        const aVal = 'goldValue' in a ? (a as { goldValue: number }).goldValue : 0;
        const bVal = 'goldValue' in b ? (b as { goldValue: number }).goldValue : 0;
        return aVal - bVal;
      });

    let discarded = 0;
    while (cardsToDiscard.length > 0 && (player.hand.length - discarded) > limit) {
      const card = cardsToDiscard.shift()!;
      this.gameState.discardFromHand(card.id);
      discarded++;
    }

    this.gameState.endTurn();
  }

  private useOneShotsIfNeeded(state: GameState, player: Player, monsterStr: number): void {
    if (!state.combat) return;

    let currentStrength = this.calcPlayerCombatStr(state, player);

    if (currentStrength <= monsterStr) {
      const deficit = monsterStr - currentStrength + 1; // How much we need to add

      // Sort by bonus ascending so we use the smallest sufficient item first
      const oneShots = [...player.hand]
        .filter(c => c.type === 'one-shot' && c.usableInCombat)
        .sort((a, b) => {
          const aBonus = a.type === 'one-shot' ? (a as { bonus: number }).bonus : 0;
          const bBonus = b.type === 'one-shot' ? (b as { bonus: number }).bonus : 0;
          return aBonus - bBonus;
        });

      // First try to find a single card that covers the deficit
      const singleSolution = oneShots.find(c => (c as { bonus: number }).bonus >= deficit);
      if (singleSolution) {
        this.gameState.useOneShotInCombat(singleSolution.id);
        return;
      }

      // Otherwise use from largest to smallest until we win
      const byDescending = [...oneShots].reverse();
      for (const card of byDescending) {
        if (currentStrength > monsterStr) break;
        if (card.type === 'one-shot') {
          this.gameState.useOneShotInCombat(card.id);
          currentStrength += (card as { bonus: number }).bonus;
        }
      }
    }
  }
}
