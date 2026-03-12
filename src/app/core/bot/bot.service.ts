import { Injectable } from '@angular/core';
import { Player, getCombatStrength } from '../models';
import { GameStateService } from '../engine/game-state.service';
import { EquipmentService } from '../engine/equipment.service';
import { GameState } from '../models';

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

    switch (state.turnPhase) {
      case 'kick-door':
        this.handleKickDoor();
        break;
      case 'combat':
        this.handleCombat(state, player);
        break;
      case 'loot-room':
        this.gameState.lootRoom();
        this.gameState.endTurn();
        break;
      case 'charity':
        this.gameState.endTurn();
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
      this.gameState.endTurn();
    } else {
      this.gameState.endTurn();
    }
  }

  private handleCombat(state: GameState, player: Player): void {
    // Use one-shot items if needed
    this.useOneShotsIfNeeded(state, player);

    const result = this.gameState.resolveCombat();
    if (!result.won) {
      this.gameState.runAway();
    }

    const afterState = this.gameState.getState();
    if (afterState && afterState.turnPhase !== 'kick-door') {
      this.gameState.endTurn();
    }
  }

  private equipBestItems(player: Player): void {
    const equipmentCards = player.hand.filter(c => c.type === 'equipment');
    for (const card of equipmentCards) {
      if (card.type === 'equipment' && this.equipmentService.canEquip(player, card)) {
        // Simple strategy: equip if bonus is higher than what's equipped in that slot
        const currentBonus = this.equipmentService.getEquipmentBonus(player.equipment);
        const testResult = this.equipmentService.equip(player, card);
        const newBonus = this.equipmentService.getEquipmentBonus(testResult.player.equipment);
        if (newBonus > currentBonus) {
          // Actually play it via gameState would require integration
          // For now bots just try to equip through state
        }
      }
    }
  }

  private playUsefulCards(player: Player): void {
    // Play class cards if don't have a class
    if (!player.className) {
      const classCard = player.hand.find(c => c.type === 'class');
      if (classCard) this.gameState.playCardFromHand(classCard.id);
    }

    // Play race cards if don't have a race
    if (!player.raceName) {
      const raceCard = player.hand.find(c => c.type === 'race');
      if (raceCard) this.gameState.playCardFromHand(raceCard.id);
    }

    // Play level-up cards
    for (const card of [...player.hand]) {
      if (card.type === 'level-up') {
        this.gameState.playCardFromHand(card.id);
      }
    }
  }

  private useOneShotsIfNeeded(state: GameState, player: Player): void {
    if (!state.combat) return;

    const playerStrength = getCombatStrength(player) +
      state.combat.playerBonuses.reduce((sum, c) => sum + c.bonus, 0);
    const monsterStrength = state.combat.monster.level + state.combat.monsterBonuses;

    if (playerStrength <= monsterStrength) {
      // Use one-shot items to try to win
      const oneShots = player.hand.filter(c => c.type === 'one-shot' && c.usableInCombat);
      let currentStrength = playerStrength;

      for (const card of oneShots) {
        if (currentStrength > monsterStrength) break;
        if (card.type === 'one-shot') {
          this.gameState.useOneShotInCombat(card.id);
          currentStrength += card.bonus;
        }
      }
    }
  }
}
