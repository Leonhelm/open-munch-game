import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/engine/game-state.service';
import { BotService } from '../../core/bot/bot.service';
import { EquipmentService } from '../../core/engine/equipment.service';
import { HandComponent } from '../hand/hand.component';
import { CombatComponent } from '../combat/combat.component';
import { getCombatStrength } from '../../core/models';

@Component({
  selector: 'app-game-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HandComponent, CombatComponent],
  template: `
    @if (state(); as s) {
      @if (s.winnerId) {
        <div class="victory-overlay">
          <div class="victory-box">
            <h1>Победа!</h1>
            <p>{{ winnerName() }} достиг 10 уровня!</p>
            <button (click)="backToLobby()">В лобби</button>
          </div>
        </div>
      }

      <div class="board">
        <div class="players-panel">
          <h3>Игроки</h3>
          @for (p of s.players; track p.id; let i = $index) {
            <div class="player-row" [class.active]="i === s.currentPlayerIndex">
              <span class="player-name">{{ p.name }}</span>
              <span class="player-level">Ур. {{ p.level }}</span>
              <span class="player-strength">Сила: {{ getStrength(i) }}</span>
              @if (p.className) { <span class="player-tag">{{ p.className }}</span> }
              @if (p.raceName) { <span class="player-tag">{{ p.raceName }}</span> }
            </div>
          }
        </div>

        <div class="main-area">
          <div class="phase-info">
            <span class="phase-label">{{ phaseLabel() }}</span>
            <span class="turn-info">Ход: {{ currentPlayerName() }}</span>
          </div>

          @if (isHumanTurn()) {
            <div class="actions">
              @switch (s.turnPhase) {
                @case ('kick-door') {
                  <button class="action-btn" (click)="kickDoor()">Выбить дверь</button>
                }
                @case ('combat') {
                  @if (s.combat) {
                    <app-combat
                      [combat]="s.combat"
                      [player]="s.players[s.currentPlayerIndex]!"
                      (fight)="fight()"
                      (run)="runAway()"
                      (useItem)="useItem($event)"
                    />
                  }
                }
                @case ('loot-room') {
                  <button class="action-btn" (click)="lootRoom()">Обыскать комнату</button>
                }
                @case ('charity') {
                  <button class="action-btn" (click)="endTurn()">Завершить ход</button>
                }
                @case ('end-turn') {
                  <button class="action-btn" (click)="endTurn()">Завершить ход</button>
                }
              }
            </div>

            <div class="equipment-section">
              <h4>Экипировка</h4>
              <div class="equipment-list">
                @for (item of equippedItems(); track item.id) {
                  <span class="eq-item">{{ item.name }} (+{{ item.bonus }})</span>
                } @empty {
                  <span class="eq-empty">Нет экипировки</span>
                }
              </div>
            </div>

            <app-hand
              [cards]="s.players[s.currentPlayerIndex]!.hand"
              (playCard)="playCard($event)"
            />
          } @else {
            <div class="bot-turn">
              <p>Ход бота...</p>
            </div>
          }
        </div>

        <div class="log-panel">
          <h3>Лог</h3>
          <div class="log-entries">
            @for (entry of recentLog(); track $index) {
              <div class="log-entry">{{ entry }}</div>
            }
          </div>
        </div>
      </div>
    } @else {
      <div class="no-game">
        <p>Игра не начата</p>
        <button (click)="backToLobby()">В лобби</button>
      </div>
    }
  `,
  styles: [`
    .board {
      display: grid;
      grid-template-columns: 200px 1fr 220px;
      gap: 12px;
      padding: 12px;
      height: 100vh;
      box-sizing: border-box;
    }
    .players-panel, .log-panel {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 8px;
      overflow-y: auto;
    }
    h3 { margin: 0 0 8px; font-size: 14px; }
    h4 { margin: 8px 0 4px; font-size: 13px; }
    .player-row {
      padding: 6px 8px;
      border-radius: 4px;
      margin-bottom: 4px;
      font-size: 13px;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
    }
    .player-row.active { background: #e3f2fd; font-weight: bold; }
    .player-name { flex: 1; }
    .player-level { font-size: 12px; }
    .player-strength { font-size: 11px; color: #666; }
    .player-tag {
      font-size: 10px;
      background: #f0f0f0;
      padding: 1px 6px;
      border-radius: 3px;
    }
    .main-area {
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
    }
    .phase-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #f5f5f5;
      border-radius: 6px;
    }
    .phase-label { font-weight: bold; }
    .turn-info { font-size: 13px; color: #666; }
    .actions { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .action-btn {
      padding: 12px 32px;
      font-size: 16px;
      cursor: pointer;
      background: #1565c0;
      color: white;
      border: none;
      border-radius: 8px;
    }
    .equipment-section { padding: 4px 0; }
    .equipment-list { display: flex; gap: 6px; flex-wrap: wrap; }
    .eq-item {
      font-size: 12px;
      background: #fff3e0;
      border: 1px solid #e65100;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .eq-empty { font-size: 12px; color: #999; }
    .log-entries { font-size: 12px; }
    .log-entry { padding: 3px 0; border-bottom: 1px solid #f0f0f0; }
    .bot-turn { text-align: center; padding: 20px; color: #666; }
    .victory-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    .victory-box {
      background: white;
      padding: 32px;
      border-radius: 12px;
      text-align: center;
    }
    .victory-box h1 { color: #2e7d32; }
    .victory-box button {
      margin-top: 16px;
      padding: 10px 28px;
      font-size: 16px;
      cursor: pointer;
      background: #1565c0;
      color: white;
      border: none;
      border-radius: 6px;
    }
    .no-game { text-align: center; padding: 60px; }
    .no-game button {
      padding: 10px 24px;
      font-size: 16px;
      cursor: pointer;
      background: #1565c0;
      color: white;
      border: none;
      border-radius: 6px;
    }
  `],
})
export class GameBoardComponent {
  private readonly gameState = inject(GameStateService);
  private readonly botService = inject(BotService);
  private readonly equipService = inject(EquipmentService);
  private readonly router = inject(Router);

  readonly state = this.gameState.state;

  readonly currentPlayerName = computed(() => {
    const s = this.state();
    return s ? s.players[s.currentPlayerIndex]?.name ?? '' : '';
  });

  readonly isHumanTurn = computed(() => {
    const s = this.state();
    return s ? s.players[s.currentPlayerIndex]?.isHuman ?? false : false;
  });

  readonly winnerName = computed(() => {
    const s = this.state();
    if (!s?.winnerId) return '';
    return s.players.find(p => p.id === s.winnerId)?.name ?? '';
  });

  readonly equippedItems = computed(() => {
    const s = this.state();
    if (!s) return [];
    const p = s.players[s.currentPlayerIndex]!;
    return this.equipService.getAllEquipped(p.equipment);
  });

  readonly recentLog = computed(() => {
    const s = this.state();
    if (!s) return [];
    return s.log.slice(-20).reverse();
  });

  readonly phaseLabel = computed(() => {
    const s = this.state();
    if (!s) return '';
    const labels: Record<string, string> = {
      'kick-door': 'Выбить дверь',
      'combat': 'Бой',
      'loot-room': 'Обыск комнаты',
      'charity': 'Благотворительность',
      'end-turn': 'Конец хода',
    };
    return labels[s.turnPhase] ?? s.turnPhase;
  });

  getStrength(index: number): number {
    const s = this.state();
    if (!s) return 0;
    return getCombatStrength(s.players[index]!);
  }

  kickDoor(): void {
    this.gameState.kickDoor();
  }

  fight(): void {
    this.gameState.resolveCombat();
  }

  runAway(): void {
    this.gameState.runAway();
  }

  useItem(cardId: string): void {
    this.gameState.useOneShotInCombat(cardId);
  }

  lootRoom(): void {
    this.gameState.lootRoom();
  }

  playCard(cardId: string): void {
    this.gameState.playCardFromHand(cardId);
  }

  endTurn(): void {
    this.gameState.endTurn();
    this.runBotTurns();
  }

  backToLobby(): void {
    this.router.navigate(['/']);
  }

  private runBotTurns(): void {
    const s = this.state();
    if (!s || s.winnerId) return;
    const current = s.players[s.currentPlayerIndex];
    if (!current || current.isHuman) return;

    setTimeout(() => {
      this.botService.playBotTurn();
      this.runBotTurns();
    }, 400);
  }
}
