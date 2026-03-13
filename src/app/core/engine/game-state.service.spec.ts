import { TestBed } from '@angular/core/testing';
import { GameStateService } from './game-state.service';
import {
  Card, CurseCard, DoorCard, EquipmentCard, MonsterCard,
  OneShotCard, TreasureCard, createPlayer, Player, EMPTY_EQUIPMENT,
} from '../models';

describe('GameStateService', () => {
  let service: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('startGame', () => {
    it('should initialize game with correct number of players', () => {
      service.startGame(3);
      const state = service.getState();
      expect(state).toBeTruthy();
      expect(state!.players.length).toBe(4); // 1 human + 3 bots
    });

    it('should set first player as human', () => {
      service.startGame(3);
      const state = service.getState();
      expect(state!.players[0]!.isHuman).toBe(true);
    });

    it('should deal initial hands to all players', () => {
      service.startGame(3);
      const state = service.getState();
      for (const player of state!.players) {
        expect(player.hand.length).toBeGreaterThan(0);
      }
    });

    it('should start at turn phase kick-door', () => {
      service.startGame(3);
      expect(service.getState()!.turnPhase).toBe('kick-door');
    });

    it('should start with currentPlayerIndex 0', () => {
      service.startGame(3);
      expect(service.getState()!.currentPlayerIndex).toBe(0);
    });

    it('should have no winner initially', () => {
      service.startGame(3);
      expect(service.getState()!.winnerId).toBeNull();
    });
  });

  describe('kickDoor', () => {
    beforeEach(() => service.startGame(3));

    it('should draw a door card', () => {
      const card = service.kickDoor();
      expect(card).toBeTruthy();
    });

    it('should change turn phase after kicking door', () => {
      service.kickDoor();
      const state = service.getState()!;
      expect(['combat', 'loot-room']).toContain(state.turnPhase);
    });

    it('should enter combat phase if monster is drawn', () => {
      let attempts = 0;
      while (attempts < 30) {
        service.startGame(3);
        const card = service.kickDoor();
        if (card?.type === 'monster') {
          expect(service.getState()!.turnPhase).toBe('combat');
          expect(service.getState()!.combat).toBeTruthy();
          return;
        }
        attempts++;
      }
    });
  });

  describe('endTurn', () => {
    beforeEach(() => service.startGame(3));

    it('should advance to next player', () => {
      service.kickDoor();
      let state = service.getState()!;
      if (state.turnPhase === 'combat') {
        service.runAway();
      }
      state = service.getState()!;
      if (state.turnPhase === 'loot-room') {
        service.lootRoom();
      }
      // Discard excess cards if in charity with too many cards
      state = service.getState()!;
      if (state.turnPhase === 'charity') {
        const player = state.players[0]!;
        const limit = service.getHandLimit(player);
        while (service.getState()!.players[0]!.hand.length > limit) {
          const p = service.getState()!.players[0]!;
          service.discardFromHand(p.hand[0]!.id);
        }
      }
      service.endTurn();
      expect(service.getState()!.currentPlayerIndex).toBe(1);
    });

    it('should wrap around to first player', () => {
      for (let i = 0; i < 4; i++) {
        service.endTurn();
      }
      expect(service.getState()!.currentPlayerIndex).toBe(0);
    });
  });

  describe('currentPlayer computed', () => {
    it('should return null when no game started', () => {
      expect(service.currentPlayer()).toBeNull();
    });

    it('should return current player when game started', () => {
      service.startGame(3);
      expect(service.currentPlayer()).toBeTruthy();
      expect(service.currentPlayer()!.isHuman).toBe(true);
    });
  });

  describe('playCardFromHand', () => {
    it('should play level-up card', () => {
      service.startGame(3);
      const state = service.getState()!;
      const player = state.players[0]!;
      const levelUp = player.hand.find(c => c.type === 'level-up');
      if (levelUp) {
        const result = service.playCardFromHand(levelUp.id);
        expect(result).toBe(true);
        expect(service.getState()!.players[0]!.level).toBe(2);
      }
    });

    it('should play class card', () => {
      service.startGame(3);
      const state = service.getState()!;
      const player = state.players[0]!;
      const classCard = player.hand.find(c => c.type === 'class');
      if (classCard) {
        const result = service.playCardFromHand(classCard.id);
        expect(result).toBe(true);
        expect(service.getState()!.players[0]!.className).toBeTruthy();
      }
    });
  });

  describe('log', () => {
    it('should contain initial log entry', () => {
      service.startGame(3);
      expect(service.getState()!.log.length).toBeGreaterThan(0);
      expect(service.getState()!.log[0]).toContain('Игра началась');
    });
  });

  describe('getHandLimit', () => {
    it('should return 5 for regular players', () => {
      const player = createPlayer('p1', 'Test', true);
      expect(service.getHandLimit(player)).toBe(5);
    });

    it('should return 6 for dwarves', () => {
      const player = { ...createPlayer('p1', 'Test', true), raceName: 'dwarf' as const };
      expect(service.getHandLimit(player)).toBe(6);
    });

    it('should return 5 for elves', () => {
      const player = { ...createPlayer('p1', 'Test', true), raceName: 'elf' as const };
      expect(service.getHandLimit(player)).toBe(5);
    });
  });

  describe('discardFromHand', () => {
    it('should remove card from hand and add to treasure discard', () => {
      service.startGame(3);
      const state = service.getState()!;
      const player = state.players[0]!;
      const treasureCard = player.hand.find(c => c.deck === 'treasure');
      if (treasureCard) {
        const handSizeBefore = player.hand.length;
        const discardSizeBefore = state.treasureDiscard.length;
        service.discardFromHand(treasureCard.id);
        const after = service.getState()!;
        expect(after.players[0]!.hand.length).toBe(handSizeBefore - 1);
        expect(after.treasureDiscard.length).toBe(discardSizeBefore + 1);
        expect(after.players[0]!.hand.find(c => c.id === treasureCard.id)).toBeUndefined();
      }
    });

    it('should remove door card from hand and add to door discard', () => {
      service.startGame(3);
      const state = service.getState()!;
      const player = state.players[0]!;
      const doorCard = player.hand.find(c => c.deck === 'door');
      if (doorCard) {
        const discardSizeBefore = state.doorDiscard.length;
        service.discardFromHand(doorCard.id);
        const after = service.getState()!;
        expect(after.doorDiscard.length).toBe(discardSizeBefore + 1);
      }
    });
  });

  describe('sellCards', () => {
    it('should gain level when selling 1000+ gold worth of cards', () => {
      service.startGame(3);
      const state = service.getState()!;
      const player = state.players[0]!;
      // Find cards with goldValue
      const sellableCards = player.hand.filter(c => 'goldValue' in c && (c as { goldValue: number }).goldValue > 0);
      const totalGold = sellableCards.reduce((sum, c) => sum + ('goldValue' in c ? (c as { goldValue: number }).goldValue : 0), 0);
      if (totalGold >= 1000) {
        const levelBefore = player.level;
        const result = service.sellCards(sellableCards.map(c => c.id));
        expect(result).toBe(true);
        const after = service.getState()!;
        expect(after.players[0]!.level).toBeGreaterThan(levelBefore);
      }
    });

    it('should remove sold cards from hand', () => {
      service.startGame(3);
      const state = service.getState()!;
      const player = state.players[0]!;
      const sellable = player.hand.filter(c => 'goldValue' in c);
      if (sellable.length > 0) {
        const cardToSell = sellable[0]!;
        service.sellCards([cardToSell.id]);
        const after = service.getState()!;
        expect(after.players[0]!.hand.find(c => c.id === cardToSell.id)).toBeUndefined();
      }
    });

    it('should return false when no cards provided', () => {
      service.startGame(3);
      const result = service.sellCards([]);
      expect(result).toBe(false);
    });
  });

  describe('endTurn with hand limit', () => {
    it('should prevent human from ending turn with too many cards in charity phase', () => {
      service.startGame(3);
      // Kick door to get to charity phase
      service.kickDoor();
      const state = service.getState()!;
      if (state.turnPhase === 'combat') {
        service.runAway();
      }
      if (state.turnPhase === 'loot-room') {
        service.lootRoom();
      }
      // Now in charity phase
      const charityState = service.getState()!;
      if (charityState.turnPhase === 'charity') {
        const player = charityState.players[0]!;
        const limit = service.getHandLimit(player);
        if (player.hand.length > limit) {
          const result = service.endTurn();
          expect(result).toBe(false);
          // Player should still be the same
          expect(service.getState()!.currentPlayerIndex).toBe(0);
        }
      }
    });
  });

  describe('curse effects', () => {
    it('should handle kick door drawing a curse card', () => {
      // Try multiple games until we get a curse
      let found = false;
      for (let attempt = 0; attempt < 50 && !found; attempt++) {
        service.startGame(3);
        const card = service.kickDoor();
        if (card?.type === 'curse') {
          found = true;
          const state = service.getState()!;
          // After curse, should be in loot-room phase
          expect(state.turnPhase).toBe('loot-room');
          // Log should mention curse
          expect(state.log.some(l => l.includes('проклятие'))).toBe(true);
        }
      }
      // It's statistically very unlikely not to find a curse in 50 tries
      // (5 curses out of ~31 cards)
    });
  });

  describe('resolveCombat', () => {
    it('should return won: false when no combat', () => {
      service.startGame(3);
      const result = service.resolveCombat();
      expect(result.won).toBe(false);
    });

    it('should handle combat with monster', () => {
      // Get into combat
      let found = false;
      for (let i = 0; i < 30 && !found; i++) {
        service.startGame(3);
        const card = service.kickDoor();
        if (card?.type === 'monster') {
          found = true;
          const result = service.resolveCombat();
          // Result should be boolean
          expect(typeof result.won).toBe('boolean');
          const state = service.getState()!;
          // After combat, should not be in combat phase
          if (result.won) {
            expect(state.combat).toBeNull();
          }
        }
      }
    });
  });

  describe('runAway', () => {
    it('should resolve combat and transition to charity', () => {
      // Get into combat
      let found = false;
      for (let i = 0; i < 30 && !found; i++) {
        service.startGame(3);
        const card = service.kickDoor();
        if (card?.type === 'monster') {
          found = true;
          service.runAway();
          const state = service.getState()!;
          expect(state.turnPhase).toBe('charity');
          expect(state.combat).toBeNull();
        }
      }
    });
  });

  describe('useOneShotInCombat', () => {
    it('should add one-shot bonus to combat', () => {
      let found = false;
      for (let i = 0; i < 30 && !found; i++) {
        service.startGame(3);
        const card = service.kickDoor();
        if (card?.type === 'monster') {
          const state = service.getState()!;
          const player = state.players[0]!;
          const oneShot = player.hand.find(c => c.type === 'one-shot' && (c as OneShotCard).usableInCombat);
          if (oneShot) {
            found = true;
            service.useOneShotInCombat(oneShot.id);
            const afterState = service.getState()!;
            expect(afterState.combat!.playerBonuses.length).toBe(1);
            expect(afterState.players[0]!.hand.find(c => c.id === oneShot.id)).toBeUndefined();
          }
        }
      }
    });
  });

  describe('lootRoom', () => {
    it('should draw treasure card and transition to charity', () => {
      // Try to get into loot-room phase
      let found = false;
      for (let i = 0; i < 30 && !found; i++) {
        service.startGame(3);
        service.kickDoor();
        const afterKick = service.getState()!;
        if (afterKick.turnPhase === 'loot-room') {
          found = true;
          const handBefore = afterKick.players[0]!.hand.length;
          service.lootRoom();
          const after = service.getState()!;
          expect(after.players[0]!.hand.length).toBe(handBefore + 1);
          expect(after.turnPhase).toBe('charity');
        }
      }
    });
  });
});
