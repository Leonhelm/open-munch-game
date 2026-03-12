import { TestBed } from '@angular/core/testing';
import { BotService } from './bot.service';
import { GameStateService } from '../engine/game-state.service';

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
});
