import { computed, Injectable, signal } from '@angular/core';
import {
  Card, CombatState, DoorCard, EquipmentCard, GameState, MonsterCard,
  OneShotCard, Player, TurnPhase, createPlayer, TreasureCard,
} from '../models';
import { DeckService, Deck } from './deck.service';
import { EquipmentService } from './equipment.service';
import { DOOR_CARDS } from '../../data/door-cards';
import { TREASURE_CARDS } from '../../data/treasure-cards';

const BOT_NAMES = ['Гном Бьорн', 'Эльфа Лира', 'Орк Грок', 'Маг Зед', 'Вор Тень', 'Дварф Торин'];

@Injectable({ providedIn: 'root' })
export class GameStateService {
  private readonly _state = signal<GameState | null>(null);
  private doorDeck!: Deck<DoorCard>;
  private treasureDeck!: Deck<TreasureCard>;

  readonly state = this._state.asReadonly();
  readonly currentPlayer = computed(() => {
    const s = this._state();
    if (!s) return null;
    return s.players[s.currentPlayerIndex] ?? null;
  });
  readonly isGameOver = computed(() => this._state()?.winnerId !== null);

  constructor(private readonly deckService: DeckService) {}

  startGame(botCount: number): void {
    this.doorDeck = this.deckService.createDeck(DOOR_CARDS);
    this.treasureDeck = this.deckService.createDeck(TREASURE_CARDS);

    const players: Player[] = [createPlayer('human', 'Игрок', true)];
    for (let i = 0; i < botCount; i++) {
      players.push(createPlayer(`bot-${i}`, BOT_NAMES[i] ?? `Бот ${i + 1}`, false));
    }

    // Deal initial hands: 4 door + 4 treasure each
    for (let p = 0; p < players.length; p++) {
      const hand: Card[] = [];
      for (let i = 0; i < 4; i++) {
        const doorCard = this.deckService.draw(this.doorDeck);
        if (doorCard) hand.push(doorCard);
        const treasureCard = this.deckService.draw(this.treasureDeck);
        if (treasureCard) hand.push(treasureCard);
      }
      players[p] = { ...players[p]!, hand };
    }

    this._state.set({
      players,
      currentPlayerIndex: 0,
      turnPhase: 'kick-door',
      doorDeck: this.doorDeck.cards,
      doorDiscard: this.doorDeck.discard,
      treasureDeck: this.treasureDeck.cards,
      treasureDiscard: this.treasureDeck.discard,
      combat: null,
      log: ['Игра началась!'],
      winnerId: null,
    });
  }

  kickDoor(): DoorCard | null {
    const card = this.deckService.draw(this.doorDeck);
    if (!card) return null;

    this.updateState(state => {
      if (card.type === 'monster') {
        return {
          ...state,
          turnPhase: 'combat' as TurnPhase,
          combat: {
            monster: card,
            playerBonuses: [],
            monsterBonuses: 0,
            helperId: null,
            helperBonuses: [],
          },
          log: [...state.log, `${this.getCurrentPlayerName(state)} выбил дверь и встретил ${card.name} (уровень ${card.level})!`],
        };
      }

      if (card.type === 'curse') {
        return this.applyCurseToState(state, card);
      }

      // Class, Race, or other door card — add to hand
      const players = this.updateCurrentPlayerHand(state, hand => [...hand, card]);
      return {
        ...state,
        players,
        turnPhase: 'loot-room' as TurnPhase,
        log: [...state.log, `${this.getCurrentPlayerName(state)} нашёл карту: ${card.name}`],
      };
    });

    return card;
  }

  lootRoom(): TreasureCard | null {
    const card = this.deckService.draw(this.treasureDeck);
    if (!card) return null;

    this.updateState(state => {
      const players = this.updateCurrentPlayerHand(state, hand => [...hand, card as Card]);
      return {
        ...state,
        players,
        turnPhase: 'charity' as TurnPhase,
        log: [...state.log, `${this.getCurrentPlayerName(state)} обыскал комнату и нашёл: ${card.name}`],
      };
    });

    return card;
  }

  useOneShotInCombat(cardId: string): void {
    this.updateState(state => {
      if (!state.combat) return state;
      const player = state.players[state.currentPlayerIndex]!;
      const card = player.hand.find(c => c.id === cardId);
      if (!card || card.type !== 'one-shot') return state;

      const players = this.updateCurrentPlayerHand(state, hand => hand.filter(c => c.id !== cardId));
      return {
        ...state,
        players,
        combat: {
          ...state.combat,
          playerBonuses: [...state.combat.playerBonuses, card as OneShotCard],
        },
      };
    });
  }

  resolveCombat(): { won: boolean; ranAway?: boolean } {
    const state = this._state();
    if (!state?.combat) return { won: false };

    const player = state.players[state.currentPlayerIndex]!;
    const playerStrength = player.level +
      this.getEquipmentBonus(player) +
      state.combat.playerBonuses.reduce((sum, c) => sum + c.bonus, 0);

    const monsterStrength = state.combat.monster.level + state.combat.monsterBonuses;

    if (playerStrength > monsterStrength) {
      this.winCombat();
      return { won: true };
    }
    return { won: false };
  }

  runAway(): boolean {
    const diceRoll = Math.floor(Math.random() * 6) + 1;
    const escaped = diceRoll >= 5;

    this.updateState(state => {
      if (!state.combat) return state;
      if (escaped) {
        return {
          ...state,
          turnPhase: 'charity' as TurnPhase,
          combat: null,
          log: [...state.log, `${this.getCurrentPlayerName(state)} бросил ${diceRoll} и сбежал!`],
        };
      }

      // Bad stuff
      const players = this.applyBadStuff(state);
      return {
        ...state,
        players,
        turnPhase: 'charity' as TurnPhase,
        combat: null,
        log: [...state.log, `${this.getCurrentPlayerName(state)} бросил ${diceRoll} и не смог сбежать! ${state.combat!.monster.badStuff}`],
      };
    });

    return escaped;
  }

  endTurn(): void {
    this.updateState(state => {
      const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
      return {
        ...state,
        currentPlayerIndex: nextIndex,
        turnPhase: 'kick-door' as TurnPhase,
        combat: null,
        log: [...state.log, `Ход переходит к ${state.players[nextIndex]!.name}`],
      };
    });
  }

  playCardFromHand(cardId: string): boolean {
    const state = this._state();
    if (!state) return false;

    const player = state.players[state.currentPlayerIndex]!;
    const card = player.hand.find(c => c.id === cardId);
    if (!card) return false;

    if (card.type === 'class') {
      this.updateState(s => {
        const players = s.players.map((p, i) =>
          i === s.currentPlayerIndex
            ? { ...p, className: card.className, hand: p.hand.filter(c => c.id !== cardId) }
            : p
        );
        return { ...s, players, log: [...s.log, `${player.name} стал ${card.name}!`] };
      });
      return true;
    }

    if (card.type === 'race') {
      this.updateState(s => {
        const players = s.players.map((p, i) =>
          i === s.currentPlayerIndex
            ? { ...p, raceName: card.raceName, hand: p.hand.filter(c => c.id !== cardId) }
            : p
        );
        return { ...s, players, log: [...s.log, `${player.name} стал ${card.name}!`] };
      });
      return true;
    }

    if (card.type === 'level-up') {
      this.updateState(s => {
        const players = s.players.map((p, i) =>
          i === s.currentPlayerIndex
            ? { ...p, level: p.level + 1, hand: p.hand.filter(c => c.id !== cardId) }
            : p
        );
        const newState = { ...s, players, log: [...s.log, `${player.name} использовал ${card.name} и получил уровень!`] };
        return this.checkWinCondition(newState);
      });
      return true;
    }

    return false;
  }

  getState(): GameState | null {
    return this._state();
  }

  private winCombat(): void {
    this.updateState(state => {
      if (!state.combat) return state;

      const monster = state.combat.monster;
      const levelsGained = monster.levelsGained;
      const treasureCount = monster.treasures;

      const treasures: Card[] = [];
      for (let i = 0; i < treasureCount; i++) {
        const t = this.deckService.draw(this.treasureDeck);
        if (t) treasures.push(t);
      }

      const players = state.players.map((p, i) => {
        if (i !== state.currentPlayerIndex) return p;
        return {
          ...p,
          level: p.level + levelsGained,
          hand: [...p.hand, ...treasures],
        };
      });

      let newState: GameState = {
        ...state,
        players,
        turnPhase: 'charity' as TurnPhase,
        combat: null,
        log: [...state.log, `${this.getCurrentPlayerName(state)} победил ${monster.name}! +${levelsGained} уровень, +${treasureCount} сокровищ`],
      };

      newState = this.checkWinCondition(newState);
      return newState;
    });
  }

  private applyBadStuff(state: GameState): readonly Player[] {
    if (!state.combat) return state.players;
    const monster = state.combat.monster;

    return state.players.map((p, i) => {
      if (i !== state.currentPlayerIndex) return p;
      // Simple bad stuff: lose 1 level (minimum 1)
      return { ...p, level: Math.max(1, p.level - 1) };
    });
  }

  private applyCurseToState(state: GameState, card: { name: string; effect: { kind: string } }): GameState {
    const players = state.players.map((p, i) => {
      if (i !== state.currentPlayerIndex) return p;
      switch (card.effect.kind) {
        case 'lose-level':
          return { ...p, level: Math.max(1, p.level - 1) };
        case 'lose-class':
          return { ...p, className: null };
        case 'lose-race':
          return { ...p, raceName: null };
        default:
          return { ...p, level: Math.max(1, p.level - 1) };
      }
    });

    return {
      ...state,
      players,
      turnPhase: 'loot-room' as TurnPhase,
      log: [...state.log, `${this.getCurrentPlayerName(state)} попал под проклятие: ${card.name}!`],
    };
  }

  private checkWinCondition(state: GameState): GameState {
    const winner = state.players.find(p => p.level >= 10);
    if (winner) {
      return { ...state, winnerId: winner.id, log: [...state.log, `${winner.name} достиг 10 уровня и победил!`] };
    }
    return state;
  }

  private updateState(updater: (state: GameState) => GameState): void {
    const current = this._state();
    if (!current) return;
    this._state.set(updater(current));
  }

  private updateCurrentPlayerHand(state: GameState, updater: (hand: readonly Card[]) => Card[]): readonly Player[] {
    return state.players.map((p, i) =>
      i === state.currentPlayerIndex ? { ...p, hand: updater(p.hand) } : p
    );
  }

  private getCurrentPlayerName(state: GameState): string {
    return state.players[state.currentPlayerIndex]?.name ?? 'Неизвестный';
  }

  private getEquipmentBonus(player: Player): number {
    const eq = player.equipment;
    return (eq.head?.bonus ?? 0) + (eq.body?.bonus ?? 0) + (eq.feet?.bonus ?? 0) +
      (eq.handLeft?.bonus ?? 0) + (eq.handRight?.bonus ?? 0);
  }
}
