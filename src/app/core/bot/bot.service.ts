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

    this.equipBestItems(player);
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

    // Try to ask for help if losing
    if (playerStr <= monsterStr) {
      this.tryAskForHelp(state, player, monsterStr);
      // Re-read state after help
      const newState = this.gameState.getState();
      if (newState) {
        playerStr = this.calcPlayerCombatStr(newState, newState.players[newState.currentPlayerIndex]!);
      }
    }

    // Use one-shot items if needed
    if (playerStr <= monsterStr) {
      this.useOneShotsIfNeeded(state, player);
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
        // Consider wizard charm for auto-escape on severe bad stuff
        if (player.className === 'wizard' && this.isSevereBadStuff(monster) && player.hand.length >= 3) {
          const cardIds = player.hand.slice(0, 3).map(c => c.id);
          this.gameState.wizardCharm(cardIds);
        } else {
          this.gameState.runAway();
        }
      }
    }

    const afterState = this.gameState.getState();
    if (afterState && afterState.turnPhase !== 'kick-door') {
      this.gameState.endTurn();
    }
  }

  private calcPlayerCombatStr(state: GameState, player: Player): number {
    if (!state.combat) return getCombatStrength(player);
    return this.gameState.getPlayerCombatStrength(state);
  }

  private isSevereBadStuff(monster: MonsterCard): boolean {
    const kind = monster.badStuffEffect.kind;
    return kind === 'lose-all-equipment' || kind === 'lose-hand' || kind === 'skip-turn';
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

    // Find player with most cards (not self)
    const targets = state.players
      .filter(p => p.id !== player.id && p.hand.length > 0)
      .sort((a, b) => b.hand.length - a.hand.length);

    if (targets.length > 0) {
      this.gameState.thiefBackstab(targets[0]!.id);
    }
  }

  private tryAskForHelp(state: GameState, player: Player, monsterStr: number): void {
    if (!state.combat || state.combat.helperId) return;

    // Find strongest potential helper who isn't leading
    const leadingLevel = Math.max(...state.players.map(p => p.level));
    const candidates = state.players
      .filter(p => p.id !== player.id)
      .map(p => ({ player: p, strength: getCombatStrength(p) }))
      .filter(c => c.player.level < leadingLevel || state.players.filter(pp => pp.level === leadingLevel).length > 1)
      .sort((a, b) => b.strength - a.strength);

    for (const candidate of candidates) {
      const combinedStr = this.calcPlayerCombatStr(state, player) + candidate.strength;
      if (combinedStr > monsterStr) {
        this.gameState.askForHelp(candidate.player.id);
        return;
      }
    }
  }

  private equipBestItems(player: Player): Player {
    let current = player;
    // Sort by bonus descending to equip best items first
    const equipmentCards = [...current.hand]
      .filter(c => c.type === 'equipment')
      .sort((a, b) => {
        const aBonus = a.type === 'equipment' ? (a as { bonus: number }).bonus : 0;
        const bBonus = b.type === 'equipment' ? (b as { bonus: number }).bonus : 0;
        return bBonus - aBonus;
      });

    for (const card of equipmentCards) {
      if (card.type === 'equipment' && this.equipmentService.canEquip(current, card)) {
        const currentBonus = this.equipmentService.getEquipmentBonus(current.equipment);
        const testResult = this.equipmentService.equip(current, card);
        const newBonus = this.equipmentService.getEquipmentBonus(testResult.player.equipment);
        if (newBonus > currentBonus) {
          this.gameState.playCardFromHand(card.id);
          const state = this.gameState.getState();
          if (state) current = state.players[state.currentPlayerIndex]!;
        }
      }
    }
    return current;
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

  private useOneShotsIfNeeded(state: GameState, player: Player): void {
    if (!state.combat) return;

    const monsterStrength = state.combat.monster.level + state.combat.monsterBonuses;
    let currentStrength = this.calcPlayerCombatStr(state, player);

    if (currentStrength <= monsterStrength) {
      // Sort by bonus descending to use most efficient items first
      const oneShots = [...player.hand]
        .filter(c => c.type === 'one-shot' && c.usableInCombat)
        .sort((a, b) => {
          const aBonus = a.type === 'one-shot' ? (a as { bonus: number }).bonus : 0;
          const bBonus = b.type === 'one-shot' ? (b as { bonus: number }).bonus : 0;
          return bBonus - aBonus;
        });

      for (const card of oneShots) {
        if (currentStrength > monsterStrength) break;
        if (card.type === 'one-shot') {
          this.gameState.useOneShotInCombat(card.id);
          currentStrength += (card as { bonus: number }).bonus;
        }
      }
    }
  }
}
