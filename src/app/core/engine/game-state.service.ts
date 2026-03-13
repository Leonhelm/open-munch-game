import { computed, Injectable, signal } from '@angular/core';
import {
  BadStuffEffect, Card, CombatState, CurseCard, CurseEffect, DoorCard,
  EquipmentCard, GameState, MonsterCard, OneShotCard, Player, TurnPhase,
  createPlayer, TreasureCard, EMPTY_EQUIPMENT,
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

  constructor(
    private readonly deckService: DeckService,
    private readonly equipmentService: EquipmentService,
  ) {}

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
      const afterBadStuff = this.applyBadStuff(state);
      return {
        ...afterBadStuff,
        turnPhase: 'charity' as TurnPhase,
        combat: null,
        log: [...afterBadStuff.log, `${this.getCurrentPlayerName(state)} бросил ${diceRoll} и не смог сбежать! ${state.combat!.monster.badStuff}`],
      };
    });

    return escaped;
  }

  endTurn(): boolean {
    const state = this._state();
    if (!state) return false;

    // Check hand limit for human players in charity phase
    const player = state.players[state.currentPlayerIndex]!;
    if (state.turnPhase === 'charity' && player.isHuman) {
      const limit = this.getHandLimit(player);
      if (player.hand.length > limit) return false;
    }

    this.updateState(s => {
      const nextIndex = (s.currentPlayerIndex + 1) % s.players.length;
      return {
        ...s,
        currentPlayerIndex: nextIndex,
        turnPhase: 'kick-door' as TurnPhase,
        combat: null,
        log: [...s.log, `Ход переходит к ${s.players[nextIndex]!.name}`],
      };
    });
    return true;
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

    if (card.type === 'equipment') {
      const eqCard = card as EquipmentCard;
      if (!this.equipmentService.canEquip(player, eqCard)) return false;
      this.updateState(s => {
        const currentPlayer = s.players[s.currentPlayerIndex]!;
        const result = this.equipmentService.equip(currentPlayer, eqCard);
        const players = s.players.map((p, i) =>
          i === s.currentPlayerIndex ? result.player : p
        );
        return { ...s, players, log: [...s.log, `${player.name} надел ${card.name} (+${eqCard.bonus})`] };
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

  getHandLimit(player: Player): number {
    return player.raceName === 'dwarf' ? 6 : 5;
  }

  discardFromHand(cardId: string): void {
    this.updateState(state => {
      const player = state.players[state.currentPlayerIndex]!;
      const card = player.hand.find(c => c.id === cardId);
      if (!card) return state;

      const players = this.updateCurrentPlayerHand(state, hand => hand.filter(c => c.id !== cardId));

      if (card.deck === 'door') {
        return { ...state, players, doorDiscard: [...state.doorDiscard, card as DoorCard] };
      }
      return { ...state, players, treasureDiscard: [...state.treasureDiscard, card as TreasureCard] };
    });
  }

  sellCards(cardIds: string[]): boolean {
    const state = this._state();
    if (!state) return false;

    const player = state.players[state.currentPlayerIndex]!;
    const cardsToSell = cardIds
      .map(id => player.hand.find(c => c.id === id))
      .filter((c): c is Card => c !== undefined);

    const totalGold = cardsToSell.reduce((sum, c) => {
      if ('goldValue' in c) return sum + (c as { goldValue: number }).goldValue;
      return sum;
    }, 0);

    const levelsGained = Math.floor(totalGold / 1000);
    if (levelsGained === 0 && cardsToSell.length === 0) return false;

    this.updateState(s => {
      const soldIds = new Set(cardIds);
      const soldCards = cardsToSell;
      const players = s.players.map((p, i) => {
        if (i !== s.currentPlayerIndex) return p;
        return {
          ...p,
          level: p.level + levelsGained,
          hand: p.hand.filter(c => !soldIds.has(c.id)),
        };
      });

      const doorDiscards = soldCards.filter(c => c.deck === 'door') as DoorCard[];
      const treasureDiscards = soldCards.filter(c => c.deck === 'treasure') as TreasureCard[];

      let newState: GameState = {
        ...s,
        players,
        doorDiscard: [...s.doorDiscard, ...doorDiscards],
        treasureDiscard: [...s.treasureDiscard, ...treasureDiscards],
        log: levelsGained > 0
          ? [...s.log, `${this.getCurrentPlayerName(s)} продал карты за ${totalGold} золота и получил ${levelsGained} уровень!`]
          : [...s.log, `${this.getCurrentPlayerName(s)} продал карты за ${totalGold} золота (недостаточно для уровня)`],
      };

      if (levelsGained > 0) {
        newState = this.checkWinCondition(newState);
      }
      return newState;
    });

    return levelsGained > 0;
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

  private applyBadStuff(state: GameState): GameState {
    if (!state.combat) return state;
    const monster = state.combat.monster;
    const effect = monster.badStuffEffect;
    const player = state.players[state.currentPlayerIndex]!;
    let updatedPlayer: Player;
    const discardedCards: Card[] = [];
    let skipNextTurn = false;

    switch (effect.kind) {
      case 'lose-levels':
        updatedPlayer = { ...player, level: Math.max(1, player.level - effect.levels) };
        break;
      case 'lose-equipment-slot': {
        const result = this.equipmentService.unequipSlot(player, effect.slot);
        if (result.card) {
          discardedCards.push(result.card);
          updatedPlayer = { ...result.player, hand: result.player.hand.filter(c => c.id !== result.card!.id) };
        } else {
          updatedPlayer = player;
        }
        break;
      }
      case 'lose-all-equipment': {
        const equipped = this.equipmentService.getAllEquipped(player.equipment);
        discardedCards.push(...equipped);
        updatedPlayer = { ...player, equipment: EMPTY_EQUIPMENT };
        break;
      }
      case 'lose-hand': {
        discardedCards.push(...player.hand);
        updatedPlayer = { ...player, hand: [] };
        break;
      }
      case 'skip-turn': {
        updatedPlayer = player;
        skipNextTurn = true;
        break;
      }
      default:
        updatedPlayer = player;
    }

    const players = state.players.map((p, i) =>
      i === state.currentPlayerIndex ? updatedPlayer : p
    );

    const doorDiscards = discardedCards.filter(c => c.deck === 'door') as DoorCard[];
    const treasureDiscards = discardedCards.filter(c => c.deck === 'treasure') as TreasureCard[];

    let nextState: GameState = {
      ...state,
      players,
      doorDiscard: [...state.doorDiscard, ...doorDiscards],
      treasureDiscard: [...state.treasureDiscard, ...treasureDiscards],
    };

    // Skip turn: advance currentPlayerIndex by 1 extra (will be advanced again in endTurn)
    if (skipNextTurn) {
      nextState = {
        ...nextState,
        log: [...nextState.log, `${player.name} пропускает следующий ход!`],
      };
    }

    return nextState;
  }

  private applyCurseToState(state: GameState, card: CurseCard): GameState {
    const player = state.players[state.currentPlayerIndex]!;
    const effect = card.effect;
    let updatedPlayer: Player;
    const discardedCards: Card[] = [];

    switch (effect.kind) {
      case 'lose-level':
        updatedPlayer = { ...player, level: Math.max(1, player.level - effect.levels) };
        break;
      case 'lose-class':
        updatedPlayer = { ...player, className: null };
        break;
      case 'lose-race':
        updatedPlayer = { ...player, raceName: null };
        break;
      case 'lose-equipment': {
        if (effect.slot) {
          const result = this.equipmentService.unequipSlot(player, effect.slot);
          // Card goes to discard, not hand — it's a curse
          if (result.card) {
            discardedCards.push(result.card);
            updatedPlayer = { ...result.player, hand: result.player.hand.filter(c => c.id !== result.card!.id) };
          } else {
            updatedPlayer = player;
          }
        } else {
          // No slot specified — lose a random equipped item
          const equipped = this.equipmentService.getAllEquipped(player.equipment);
          if (equipped.length > 0) {
            const randomItem = equipped[Math.floor(Math.random() * equipped.length)]!;
            const result = this.equipmentService.unequipSlot(player, randomItem.slot);
            if (result.card) {
              discardedCards.push(result.card);
              updatedPlayer = { ...result.player, hand: result.player.hand.filter(c => c.id !== result.card!.id) };
            } else {
              updatedPlayer = player;
            }
          } else {
            updatedPlayer = player;
          }
        }
        break;
      }
      case 'lose-hand': {
        discardedCards.push(...player.hand);
        updatedPlayer = { ...player, hand: [] };
        break;
      }
      default:
        updatedPlayer = player;
    }

    const players = state.players.map((p, i) =>
      i === state.currentPlayerIndex ? updatedPlayer : p
    );

    // Sort discarded cards into door/treasure discard piles
    const doorDiscards = discardedCards.filter(c => c.deck === 'door') as DoorCard[];
    const treasureDiscards = discardedCards.filter(c => c.deck === 'treasure') as TreasureCard[];

    return {
      ...state,
      players,
      doorDiscard: [...state.doorDiscard, ...doorDiscards],
      treasureDiscard: [...state.treasureDiscard, ...treasureDiscards],
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
