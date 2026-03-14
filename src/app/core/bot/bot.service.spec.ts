import { TestBed } from '@angular/core/testing';
import { BotService } from './bot.service';
import { GameStateService } from '../engine/game-state.service';
import { Player, createPlayer, MonsterCard, EMPTY_EQUIPMENT } from '../models';

describe('BotService', () => {
  let service: BotService;
  let gameState: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BotService);
    gameState = TestBed.inject(GameStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('playBotTurn', () => {
    it('should not act when no game is running', () => {
      service.playBotTurn();
      expect(gameState.getState()).toBeNull();
    });

    it('should not act when current player is human', () => {
      gameState.startGame(3);
      const initialState = gameState.getState()!;
      expect(initialState.currentPlayerIndex).toBe(0);
      service.playBotTurn();
      // Should still be player 0's turn since they're human
      expect(gameState.getState()!.currentPlayerIndex).toBe(0);
    });

    it('should complete a bot turn', () => {
      gameState.startGame(3);
      // Move to bot's turn
      gameState.endTurn();
      const botIndex = gameState.getState()!.currentPlayerIndex;
      expect(gameState.getState()!.players[botIndex]!.isHuman).toBe(false);

      service.playBotTurn();

      // After bot turn, should have advanced to next player
      const state = gameState.getState()!;
      expect(state.currentPlayerIndex).not.toBe(botIndex);
    });
  });

  describe('decideBotHelp', () => {
    it('should return false when no game is running', () => {
      const result = service.decideBotHelp('bot-0');
      expect(result).toBe(false);
    });

    it('should return false when no combat', () => {
      gameState.startGame(3);
      const state = gameState.getState()!;
      const botId = state.players.find(p => !p.isHuman)!.id;
      const result = service.decideBotHelp(botId);
      expect(result).toBe(false);
    });

    it('should decline help when bot is sole leader near winning', () => {
      gameState.startGame(3);
      const stateSignal = (gameState as any)._state;
      const s = stateSignal();

      // Set up combat and make bot the sole leader at high level
      const monster: MonsterCard = {
        id: 'test-m', name: 'Test', type: 'monster', deck: 'door', description: '',
        level: 5, treasures: 1, levelsGained: 1, badStuff: 'Lose 1 level',
        badStuffEffect: { kind: 'lose-levels', levels: 1 },
      };

      const botPlayer = s.players.find((p: Player) => !p.isHuman)!;
      const updatedBot = { ...botPlayer, level: 9 }; // Sole leader near win
      const players = s.players.map((p: Player) => p.id === botPlayer.id ? updatedBot : { ...p, level: 3 });

      stateSignal.set({
        ...s,
        players,
        turnPhase: 'combat',
        combat: { monster, playerBonuses: [], monsterBonuses: 0, helperId: null, helperBonuses: [], warriorBonuses: 0 },
      });

      const result = service.decideBotHelp(botPlayer.id);
      expect(result).toBe(false);
    });

    it('should accept help when bot is not leading', () => {
      gameState.startGame(3);
      const stateSignal = (gameState as any)._state;
      const s = stateSignal();

      const monster: MonsterCard = {
        id: 'test-m2', name: 'Test', type: 'monster', deck: 'door', description: '',
        level: 5, treasures: 1, levelsGained: 1, badStuff: 'Lose 1 level',
        badStuffEffect: { kind: 'lose-levels', levels: 1 },
      };

      const botPlayer = s.players.find((p: Player) => !p.isHuman)!;
      // Bot at level 3, human (fighter) also at level 3 — no clear leader
      const players = s.players.map((p: Player) => ({ ...p, level: 3 }));

      stateSignal.set({
        ...s,
        players,
        turnPhase: 'combat',
        combat: { monster, playerBonuses: [], monsterBonuses: 0, helperId: null, helperBonuses: [], warriorBonuses: 0 },
      });

      const result = service.decideBotHelp(botPlayer.id);
      expect(result).toBe(true);
    });
  });
});
