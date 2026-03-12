import { TestBed } from '@angular/core/testing';
import { GameStateService } from './game-state.service';

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
      // Keep kicking until we find a monster
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
      // Statistically very unlikely to not find a monster in 30 tries
    });
  });

  describe('endTurn', () => {
    beforeEach(() => service.startGame(3));

    it('should advance to next player', () => {
      service.kickDoor();
      const state = service.getState()!;
      if (state.turnPhase === 'combat') {
        service.runAway();
      }
      if (state.turnPhase === 'loot-room') {
        service.lootRoom();
      }
      service.endTurn();
      expect(service.getState()!.currentPlayerIndex).toBe(1);
    });

    it('should wrap around to first player', () => {
      // Advance through all players
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
});
