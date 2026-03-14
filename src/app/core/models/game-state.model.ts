import { Card, DoorCard, MonsterCard, OneShotCard } from './card.model';
import { Player } from './player.model';

export type LogType = 'combat' | 'level' | 'equipment' | 'curse' | 'system';

export interface LogEntry {
  readonly text: string;
  readonly type: LogType;
}

export type TurnPhase =
  | 'kick-door'
  | 'combat'
  | 'loot-room'
  | 'charity'
  | 'end-turn';

export interface CombatState {
  readonly monster: MonsterCard;
  readonly playerBonuses: readonly OneShotCard[];
  readonly monsterBonuses: number;
  readonly helperId: string | null;
  readonly helperBonuses: readonly OneShotCard[];
  readonly warriorBonuses: number;
}

export interface GameState {
  readonly players: readonly Player[];
  readonly currentPlayerIndex: number;
  readonly turnPhase: TurnPhase;
  readonly doorDeck: readonly DoorCard[];
  readonly doorDiscard: readonly DoorCard[];
  readonly treasureDeck: readonly Card[];
  readonly treasureDiscard: readonly Card[];
  readonly combat: CombatState | null;
  readonly log: readonly LogEntry[];
  readonly winnerId: string | null;
  readonly thiefBackstabUsed: boolean;
  readonly skipTurnPlayerIds: readonly string[];
}

export function getCurrentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex]!;
}
