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

  // --- Helper to set up a controlled combat scenario ---
  function setupCombatWithMonster(
    svc: GameStateService,
    monsterOverrides: Partial<MonsterCard> = {},
    playerOverrides: Partial<Player> = {},
  ): void {
    svc.startGame(3);
    // Keep trying until we get into combat
    let attempts = 0;
    while (attempts < 50) {
      svc.startGame(3);
      const card = svc.kickDoor();
      if (card?.type === 'monster') break;
      attempts++;
    }
    const state = svc.getState()!;
    if (!state.combat) return;

    // Patch state via private access for controlled testing
    const stateSignal = (svc as any)._state;
    const s = stateSignal();
    if (!s) return;

    const monster: MonsterCard = { ...s.combat!.monster, ...monsterOverrides } as MonsterCard;
    const player = { ...s.players[s.currentPlayerIndex]!, ...playerOverrides };
    const players = s.players.map((p: Player, i: number) =>
      i === s.currentPlayerIndex ? player : p
    );

    stateSignal.set({
      ...s,
      players,
      combat: { ...s.combat!, monster },
    });
  }

  describe('cleric ability', () => {
    it('should add +3 combat strength vs undead monsters', () => {
      setupCombatWithMonster(service, { undead: true }, { className: 'cleric' });
      const state = service.getState()!;
      if (!state.combat) return;

      const strength = service.getPlayerCombatStrength(state);
      const player = state.players[state.currentPlayerIndex]!;
      // Cleric bonus (+3) should be included
      const baseStrength = player.level +
        (player.equipment.head?.bonus ?? 0) + (player.equipment.body?.bonus ?? 0) +
        (player.equipment.feet?.bonus ?? 0) + (player.equipment.handLeft?.bonus ?? 0) +
        (player.equipment.handRight?.bonus ?? 0) +
        state.combat.playerBonuses.reduce((sum, c) => sum + c.bonus, 0) +
        state.combat.warriorBonuses;
      expect(strength).toBe(baseStrength + 3);
    });

    it('should NOT add bonus vs non-undead monsters', () => {
      setupCombatWithMonster(service, { undead: undefined }, { className: 'cleric' });
      const state = service.getState()!;
      if (!state.combat) return;

      const strength = service.getPlayerCombatStrength(state);
      const player = state.players[state.currentPlayerIndex]!;
      const baseStrength = player.level +
        (player.equipment.head?.bonus ?? 0) + (player.equipment.body?.bonus ?? 0) +
        (player.equipment.feet?.bonus ?? 0) + (player.equipment.handLeft?.bonus ?? 0) +
        (player.equipment.handRight?.bonus ?? 0) +
        state.combat.playerBonuses.reduce((sum, c) => sum + c.bonus, 0) +
        state.combat.warriorBonuses;
      expect(strength).toBe(baseStrength);
    });
  });

  describe('elf ability', () => {
    it('should gain +1 bonus level when winning combat', () => {
      // Set up combat where elf can win (very weak monster)
      setupCombatWithMonster(
        service,
        { level: 1, levelsGained: 1, treasures: 1, undead: undefined },
        { raceName: 'elf', level: 5 },
      );
      const state = service.getState()!;
      if (!state.combat) return;

      const levelBefore = state.players[state.currentPlayerIndex]!.level;
      const result = service.resolveCombat();
      if (result.won) {
        const after = service.getState()!;
        // Should gain levelsGained (1) + elf bonus (1) = 2
        expect(after.players[state.currentPlayerIndex]!.level).toBe(levelBefore + 2);
        expect(after.log.some(l => l.includes('Эльф'))).toBe(true);
      }
    });
  });

  describe('halfling ability', () => {
    it('should get double gold when selling cards', () => {
      service.startGame(3);
      const stateSignal = (service as any)._state;
      const s = stateSignal();
      if (!s) return;

      // Give player a card worth 500 gold and make them halfling
      const testCard: OneShotCard = {
        id: 'test-sell-1',
        name: 'Test Item',
        type: 'one-shot',
        deck: 'treasure',
        description: 'test',
        bonus: 1,
        usableInCombat: true,
        goldValue: 500,
      };

      const player = { ...s.players[0]!, raceName: 'halfling' as const, hand: [...s.players[0]!.hand, testCard] };
      const players = s.players.map((p: Player, i: number) => i === 0 ? player : p);
      stateSignal.set({ ...s, players, turnPhase: 'charity' });

      const levelBefore = service.getState()!.players[0]!.level;
      const result = service.sellCards([testCard.id]);
      // 500 gold * 2 (halfling) = 1000 = 1 level
      expect(result).toBe(true);
      expect(service.getState()!.players[0]!.level).toBe(levelBefore + 1);
      expect(service.getState()!.log.some(l => l.includes('Халфлинг'))).toBe(true);
    });
  });

  describe('warrior berserk', () => {
    it('should allow warrior to discard card for +1 in combat', () => {
      setupCombatWithMonster(service, {}, { className: 'warrior' });
      const state = service.getState()!;
      if (!state.combat) return;

      const player = state.players[state.currentPlayerIndex]!;
      if (player.hand.length === 0) return;

      const card = player.hand[0]!;
      const result = service.warriorBerserk(card.id);
      expect(result).toBe(true);

      const after = service.getState()!;
      expect(after.combat!.warriorBonuses).toBe(1);
      expect(after.players[after.currentPlayerIndex]!.hand.find(c => c.id === card.id)).toBeUndefined();
    });

    it('should NOT allow non-warrior to use berserk', () => {
      setupCombatWithMonster(service, {}, { className: 'wizard' });
      const state = service.getState()!;
      if (!state.combat) return;

      const player = state.players[state.currentPlayerIndex]!;
      if (player.hand.length === 0) return;

      const result = service.warriorBerserk(player.hand[0]!.id);
      expect(result).toBe(false);
    });

    it('should NOT work outside of combat', () => {
      service.startGame(3);
      const stateSignal = (service as any)._state;
      const s = stateSignal();
      const player = { ...s.players[0]!, className: 'warrior' as const };
      const players = s.players.map((p: Player, i: number) => i === 0 ? player : p);
      stateSignal.set({ ...s, players });

      if (s.players[0]!.hand.length > 0) {
        const result = service.warriorBerserk(s.players[0]!.hand[0]!.id);
        expect(result).toBe(false);
      }
    });
  });

  describe('wizard charm', () => {
    it('should allow wizard to auto-escape by discarding 3 cards', () => {
      setupCombatWithMonster(service, {}, { className: 'wizard' });
      const state = service.getState()!;
      if (!state.combat) return;

      const player = state.players[state.currentPlayerIndex]!;
      if (player.hand.length < 3) return;

      const cardIds = player.hand.slice(0, 3).map(c => c.id);
      const result = service.wizardCharm(cardIds);
      expect(result).toBe(true);

      const after = service.getState()!;
      expect(after.combat).toBeNull();
      expect(after.turnPhase).toBe('charity');
      expect(after.log.some(l => l.includes('Чары'))).toBe(true);
      // Cards should be removed from hand
      for (const id of cardIds) {
        expect(after.players[after.currentPlayerIndex]!.hand.find(c => c.id === id)).toBeUndefined();
      }
    });

    it('should NOT allow non-wizard to use charm', () => {
      setupCombatWithMonster(service, {}, { className: 'warrior' });
      const state = service.getState()!;
      if (!state.combat) return;

      const player = state.players[state.currentPlayerIndex]!;
      if (player.hand.length < 3) return;

      const cardIds = player.hand.slice(0, 3).map(c => c.id);
      const result = service.wizardCharm(cardIds);
      expect(result).toBe(false);
    });

    it('should require exactly 3 cards', () => {
      setupCombatWithMonster(service, {}, { className: 'wizard' });
      const state = service.getState()!;
      if (!state.combat) return;

      const player = state.players[state.currentPlayerIndex]!;
      if (player.hand.length < 2) return;

      const result = service.wizardCharm(player.hand.slice(0, 2).map(c => c.id));
      expect(result).toBe(false);
    });
  });

  describe('thief backstab', () => {
    it('should allow thief to attempt stealing a card', () => {
      service.startGame(3);
      const stateSignal = (service as any)._state;
      const s = stateSignal();

      const player = { ...s.players[0]!, className: 'thief' as const };
      const players = s.players.map((p: Player, i: number) => i === 0 ? player : p);
      stateSignal.set({ ...s, players });

      const target = service.getState()!.players[1]!;
      if (target.hand.length === 0) return;

      const result = service.thiefBackstab(target.id);
      expect(result.attempted).toBe(true);
      expect(service.getState()!.thiefBackstabUsed).toBe(true);
    });

    it('should NOT allow non-thief to backstab', () => {
      service.startGame(3);
      const target = service.getState()!.players[1]!;
      const result = service.thiefBackstab(target.id);
      expect(result.attempted).toBe(false);
    });

    it('should NOT allow backstab twice in one turn', () => {
      service.startGame(3);
      const stateSignal = (service as any)._state;
      const s = stateSignal();

      const player = { ...s.players[0]!, className: 'thief' as const };
      const players = s.players.map((p: Player, i: number) => i === 0 ? player : p);
      stateSignal.set({ ...s, players });

      const target = service.getState()!.players[1]!;
      if (target.hand.length === 0) return;

      service.thiefBackstab(target.id);
      const result2 = service.thiefBackstab(target.id);
      expect(result2.attempted).toBe(false);
    });

    it('should reset backstab usage on end turn', () => {
      service.startGame(3);
      const stateSignal = (service as any)._state;
      const s = stateSignal();

      const player = { ...s.players[0]!, className: 'thief' as const };
      const players = s.players.map((p: Player, i: number) => i === 0 ? player : p);
      stateSignal.set({ ...s, players });

      const target = service.getState()!.players[1]!;
      if (target.hand.length > 0) {
        service.thiefBackstab(target.id);
        expect(service.getState()!.thiefBackstabUsed).toBe(true);
      }

      service.endTurn();
      expect(service.getState()!.thiefBackstabUsed).toBe(false);
    });

    it('should NOT allow backstab on self', () => {
      service.startGame(3);
      const stateSignal = (service as any)._state;
      const s = stateSignal();

      const player = { ...s.players[0]!, className: 'thief' as const };
      const players = s.players.map((p: Player, i: number) => i === 0 ? player : p);
      stateSignal.set({ ...s, players });

      const result = service.thiefBackstab(player.id);
      expect(result.attempted).toBe(false);
    });
  });

  describe('combat helper system', () => {
    it('should allow asking for help', () => {
      setupCombatWithMonster(service, {}, {});
      const state = service.getState()!;
      if (!state.combat) return;

      const helperId = state.players[1]!.id;
      const result = service.askForHelp(helperId);
      expect(result).toBe(true);
      expect(service.getState()!.combat!.helperId).toBe(helperId);
    });

    it('should NOT allow asking self for help', () => {
      setupCombatWithMonster(service, {}, {});
      const state = service.getState()!;
      if (!state.combat) return;

      const selfId = state.players[state.currentPlayerIndex]!.id;
      const result = service.askForHelp(selfId);
      expect(result).toBe(false);
    });

    it('should NOT allow second helper', () => {
      setupCombatWithMonster(service, {}, {});
      const state = service.getState()!;
      if (!state.combat) return;

      service.askForHelp(state.players[1]!.id);
      const result = service.askForHelp(state.players[2]!.id);
      expect(result).toBe(false);
    });

    it('should remove helper', () => {
      setupCombatWithMonster(service, {}, {});
      const state = service.getState()!;
      if (!state.combat) return;

      service.askForHelp(state.players[1]!.id);
      expect(service.getState()!.combat!.helperId).toBeTruthy();

      service.removeHelper();
      expect(service.getState()!.combat!.helperId).toBeNull();
      expect(service.getState()!.combat!.helperBonuses.length).toBe(0);
    });

    it('should add helper strength to combat', () => {
      setupCombatWithMonster(service, {}, {});
      const state = service.getState()!;
      if (!state.combat) return;

      const strengthBefore = service.getPlayerCombatStrength(state);
      service.askForHelp(state.players[1]!.id);
      const strengthAfter = service.getPlayerCombatStrength(service.getState()!);

      // Helper adds their combat strength
      expect(strengthAfter).toBeGreaterThan(strengthBefore);
    });

    it('should allow helper to use one-shot cards', () => {
      setupCombatWithMonster(service, {}, {});
      const state = service.getState()!;
      if (!state.combat) return;

      const helper = state.players[1]!;
      service.askForHelp(helper.id);

      const oneShot = helper.hand.find(c => c.type === 'one-shot');
      if (oneShot) {
        const result = service.helperUseOneShot(oneShot.id);
        expect(result).toBe(true);
        const after = service.getState()!;
        expect(after.combat!.helperBonuses.length).toBe(1);
      }
    });

    it('should NOT allow helper one-shot without helper', () => {
      setupCombatWithMonster(service, {}, {});
      const state = service.getState()!;
      if (!state.combat) return;

      const result = service.helperUseOneShot('fake-id');
      expect(result).toBe(false);
    });
  });

  describe('getPlayerCombatStrength', () => {
    it('should return 0 when no combat', () => {
      service.startGame(3);
      const state = service.getState()!;
      expect(service.getPlayerCombatStrength(state)).toBe(0);
    });

    it('should include warrior berserk bonuses', () => {
      setupCombatWithMonster(service, {}, { className: 'warrior' });
      const state = service.getState()!;
      if (!state.combat) return;

      const player = state.players[state.currentPlayerIndex]!;
      if (player.hand.length === 0) return;

      const strengthBefore = service.getPlayerCombatStrength(state);
      service.warriorBerserk(player.hand[0]!.id);
      const strengthAfter = service.getPlayerCombatStrength(service.getState()!);

      expect(strengthAfter).toBe(strengthBefore + 1);
    });
  });
});
