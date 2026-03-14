import { Component, ChangeDetectionStrategy, computed, inject, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/engine/game-state.service';
import { BotService } from '../../core/bot/bot.service';
import { EquipmentService } from '../../core/engine/equipment.service';
import { AudioService } from '../../shared/audio.service';
import { HandComponent } from '../hand/hand.component';
import { CombatComponent } from '../combat/combat.component';
import { getCombatStrength, Card, LogType } from '../../core/models';

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
            <div class="player-row"
              [class.active]="i === s.currentPlayerIndex"
              [class.level-up-anim]="levelUpPlayerId() === p.id">
              <span class="player-name">{{ p.name }}</span>
              <span class="player-level">Ур. {{ p.level }}</span>
              <span class="player-strength">Сила: {{ getStrength(i) }}</span>
              @if (p.className) { <span class="player-tag class-tag">{{ p.className }}</span> }
              @if (p.raceName) { <span class="player-tag race-tag">{{ p.raceName }}</span> }
            </div>
          }
        </div>

        <div class="main-area">
          <div class="phase-info" [class.phase-changed]="phaseChanged()">
            <span class="phase-label">{{ phaseLabel() }}</span>
            <span class="turn-info">Ход: {{ currentPlayerName() }}</span>
            <button class="sound-btn" (click)="toggleSound()" title="Звук">{{ soundEnabled() ? '🔊' : '🔇' }}</button>
          </div>

          @if (isHumanTurn()) {
            <div class="actions">
              @switch (s.turnPhase) {
                @case ('kick-door') {
                  <button class="action-btn" (click)="kickDoor()">Выбить дверь</button>
                  @if (canBackstab()) {
                    <div class="backstab-section">
                      <div class="backstab-title">Удар в спину (кража карты):</div>
                      @for (p of backstabTargets(); track p.id) {
                        <button class="backstab-btn" (click)="backstab(p.id)">{{ p.name }} ({{ p.hand.length }} карт)</button>
                      }
                    </div>
                  }
                }
                @case ('combat') {
                  @if (s.combat) {
                    <app-combat
                      [combat]="s.combat"
                      [player]="s.players[s.currentPlayerIndex]!"
                      [allPlayers]="s.players"
                      (fight)="fight()"
                      (run)="runAway()"
                      (useItem)="useItem($event)"
                      (berserk)="warriorBerserk($event)"
                      (wizardEscape)="wizardCharm($event)"
                      (askHelp)="askForHelp($event)"
                      (removeHelper)="removeHelper()"
                    />
                  }
                }
                @case ('loot-room') {
                  <button class="action-btn" (click)="lootRoom()">Обыскать комнату</button>
                  @if (canBackstab()) {
                    <div class="backstab-section">
                      <div class="backstab-title">Удар в спину (кража карты):</div>
                      @for (p of backstabTargets(); track p.id) {
                        <button class="backstab-btn" (click)="backstab(p.id)">{{ p.name }} ({{ p.hand.length }} карт)</button>
                      }
                    </div>
                  }
                }
                @case ('charity') {
                  @if (charityInfo(); as info) {
                    @if (info.excess > 0) {
                      <p class="charity-msg">Сбросьте {{ info.excess }} карт (лимит: {{ info.limit }}). Кликните на карту для сброса.</p>
                    }
                    @if (selectedForSale().length > 0) {
                      <div class="sell-info">
                        <span>Продажа: {{ selectedGoldTotal() }} золота{{ isHalfling() ? ' (x2 Халфлинг!)' : '' }}</span>
                        <button class="action-btn sell-btn" (click)="sellSelected()">Продать</button>
                      </div>
                    }
                    <button class="action-btn" [disabled]="info.excess > 0" (click)="endTurn()">Завершить ход</button>
                  }
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
                  <span class="eq-item">{{ item.name }} (+{{ item.bonus }}){{ item.effect ? ' ✦' : '' }}</span>
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
          <div class="log-header">
            <h3>Лог</h3>
            <div class="log-filters">
              <button class="filter-btn" [class.active]="logFilter() === 'all'" (click)="logFilter.set('all')">Все</button>
              <button class="filter-btn filter-combat" [class.active]="logFilter() === 'combat'" (click)="logFilter.set('combat')">Бой</button>
              <button class="filter-btn filter-level" [class.active]="logFilter() === 'level'" (click)="logFilter.set('level')">Уровни</button>
              <button class="filter-btn filter-equipment" [class.active]="logFilter() === 'equipment'" (click)="logFilter.set('equipment')">Экипировка</button>
              <button class="filter-btn filter-curse" [class.active]="logFilter() === 'curse'" (click)="logFilter.set('curse')">Проклятия</button>
            </div>
          </div>
          <div class="log-entries">
            @for (entry of recentLog(); track $index) {
              <div class="log-entry" [class]="'log-' + entry.type">{{ entry.text }}</div>
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
      grid-template-columns: 200px 1fr 240px;
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
      transition: background 0.2s;
    }
    .player-row.active { background: #e3f2fd; font-weight: bold; }
    .player-name { flex: 1; }
    .player-level { font-size: 12px; }
    .player-strength { font-size: 11px; color: #666; }
    .player-tag {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 3px;
    }
    .class-tag { background: #e3f2fd; color: #1565c0; }
    .race-tag { background: #e8f5e9; color: #2e7d32; }
    .main-area {
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
    }
    .phase-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f5f5f5;
      border-radius: 6px;
      transition: background 0.3s;
    }
    .phase-info.phase-changed { background: #e8f5e9; }
    .phase-label { font-weight: bold; flex: 1; }
    .turn-info { font-size: 13px; color: #666; }
    .sound-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 2px;
      line-height: 1;
    }
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
    .log-header { display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px; }
    .log-header h3 { margin: 0; }
    .log-filters { display: flex; gap: 3px; flex-wrap: wrap; }
    .filter-btn {
      font-size: 10px;
      padding: 2px 6px;
      border: 1px solid #ccc;
      border-radius: 3px;
      background: #f9f9f9;
      cursor: pointer;
    }
    .filter-btn.active { background: #1565c0; color: white; border-color: #1565c0; }
    .filter-combat.active { background: #c62828; border-color: #c62828; }
    .filter-level.active { background: #f9a825; border-color: #f9a825; color: #000; }
    .filter-equipment.active { background: #e65100; border-color: #e65100; }
    .filter-curse.active { background: #6a1b9a; border-color: #6a1b9a; }
    .log-entries { font-size: 12px; }
    .log-entry { padding: 3px 4px; border-bottom: 1px solid #f0f0f0; border-radius: 2px; margin-bottom: 1px; }
    .log-combat { border-left: 3px solid #c62828; padding-left: 4px; }
    .log-level { border-left: 3px solid #f9a825; padding-left: 4px; }
    .log-equipment { border-left: 3px solid #e65100; padding-left: 4px; }
    .log-curse { border-left: 3px solid #6a1b9a; padding-left: 4px; }
    .log-system { border-left: 3px solid #90a4ae; padding-left: 4px; }
    .charity-msg { font-size: 14px; color: #c62828; text-align: center; }
    .sell-info { display: flex; align-items: center; gap: 8px; font-size: 14px; }
    .sell-btn { padding: 6px 16px; font-size: 14px; background: #2e7d32; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .bot-turn { text-align: center; padding: 20px; color: #666; }
    .backstab-section { margin: 8px 0; text-align: center; }
    .backstab-title { font-size: 12px; margin-bottom: 4px; color: #6a1b9a; }
    .backstab-btn {
      margin: 2px 4px;
      padding: 4px 12px;
      font-size: 12px;
      cursor: pointer;
      background: #f3e5f5;
      border: 1px solid #6a1b9a;
      border-radius: 4px;
    }
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

    /* Animations */
    @keyframes levelUp {
      0% { background: #e3f2fd; }
      30% { background: #fff9c4; box-shadow: 0 0 8px #f9a825; }
      100% { background: #e3f2fd; }
    }
    .level-up-anim { animation: levelUp 1.2s ease-out; }

    @keyframes phaseChange {
      0% { opacity: 0.5; transform: translateY(-4px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .phase-changed { animation: phaseChange 0.3s ease-out; }

    @media (max-width: 768px) {
      .board {
        grid-template-columns: 1fr;
        grid-template-rows: auto;
        height: auto;
        min-height: 100vh;
        overflow-y: auto;
        padding: 8px;
        gap: 8px;
      }
      .players-panel { max-height: 160px; overflow-y: auto; }
      .log-panel { max-height: 200px; overflow-y: auto; order: 3; }
      .main-area { overflow-y: visible; }
      .action-btn { width: 100%; box-sizing: border-box; }
      .actions { width: 100%; }
    }
  `],
})
export class GameBoardComponent {
  private readonly gameState = inject(GameStateService);
  private readonly botService = inject(BotService);
  private readonly equipService = inject(EquipmentService);
  private readonly audioService = inject(AudioService);
  private readonly router = inject(Router);

  readonly state = this.gameState.state;
  readonly logFilter = signal<'all' | LogType>('all');
  readonly levelUpPlayerId = signal<string | null>(null);
  readonly phaseChanged = signal(false);
  readonly soundEnabled = signal(true);

  private prevLevels = new Map<string, number>();
  private prevPhase = '';

  constructor() {
    // Detect level-ups and phase changes for animations + audio
    effect(() => {
      const s = this.state();
      if (!s) return;

      // Detect level-ups
      s.players.forEach(p => {
        const prev = this.prevLevels.get(p.id);
        if (prev !== undefined && p.level > prev) {
          this.levelUpPlayerId.set(p.id);
          this.audioService.play('level-up');
          setTimeout(() => this.levelUpPlayerId.set(null), 1300);
        }
        this.prevLevels.set(p.id, p.level);
      });

      // Detect phase changes for visual feedback
      const currentPhase = s.turnPhase;
      if (this.prevPhase && this.prevPhase !== currentPhase) {
        this.phaseChanged.set(true);
        setTimeout(() => this.phaseChanged.set(false), 400);
      }
      this.prevPhase = currentPhase;
    });
  }

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
    const filter = this.logFilter();
    const entries = filter === 'all' ? s.log : s.log.filter(e => e.type === filter);
    return entries.slice(-30).reverse();
  });

  readonly selectedForSale = signal<string[]>([]);

  readonly charityInfo = computed(() => {
    const s = this.state();
    if (!s) return null;
    const p = s.players[s.currentPlayerIndex]!;
    const limit = this.gameState.getHandLimit(p);
    return { limit, excess: Math.max(0, p.hand.length - limit) };
  });

  readonly selectedGoldTotal = computed(() => {
    const s = this.state();
    if (!s) return 0;
    const p = s.players[s.currentPlayerIndex]!;
    const ids = new Set(this.selectedForSale());
    const baseGold = p.hand
      .filter(c => ids.has(c.id))
      .reduce((sum, c) => sum + ('goldValue' in c ? (c as { goldValue: number }).goldValue : 0), 0);
    return p.raceName === 'halfling' ? baseGold * 2 : baseGold;
  });

  readonly isHalfling = computed(() => {
    const s = this.state();
    if (!s) return false;
    return s.players[s.currentPlayerIndex]?.raceName === 'halfling';
  });

  readonly canBackstab = computed(() => {
    const s = this.state();
    if (!s) return false;
    const p = s.players[s.currentPlayerIndex]!;
    return p.className === 'thief' && !s.thiefBackstabUsed && s.turnPhase !== 'combat';
  });

  readonly backstabTargets = computed(() => {
    const s = this.state();
    if (!s) return [];
    const currentId = s.players[s.currentPlayerIndex]!.id;
    return s.players.filter(p => p.id !== currentId && p.hand.length > 0);
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

  toggleSound(): void {
    this.audioService.toggle();
    this.soundEnabled.set(this.audioService.isEnabled());
  }

  kickDoor(): void {
    this.audioService.play('card-draw');
    this.gameState.kickDoor();
    const s = this.state();
    if (s?.turnPhase === 'combat') {
      this.audioService.play('combat-win'); // Not really win, just entering combat — use different cue
    } else if (s?.log.slice(-1)[0]?.type === 'curse') {
      this.audioService.play('curse');
    }
  }

  fight(): void {
    const result = this.gameState.resolveCombat();
    if (result.won) {
      this.audioService.play('combat-win');
    } else {
      this.audioService.play('combat-lose');
    }
  }

  runAway(): void {
    const escaped = this.gameState.runAway();
    if (!escaped) {
      this.audioService.play('combat-lose');
    }
  }

  useItem(cardId: string): void {
    this.gameState.useOneShotInCombat(cardId);
  }

  warriorBerserk(cardId: string): void {
    this.gameState.warriorBerserk(cardId);
  }

  wizardCharm(cardIds: string[]): void {
    this.gameState.wizardCharm(cardIds);
  }

  backstab(targetId: string): void {
    this.gameState.thiefBackstab(targetId);
  }

  askForHelp(helperId: string): void {
    const s = this.state();
    const helper = s?.players.find(p => p.id === helperId);
    if (!helper) return;

    this.gameState.askForHelp(helperId);

    // If the chosen helper is a bot, let it auto-decide
    if (!helper.isHuman) {
      const accepted = this.botService.decideBotHelp(helperId);
      if (!accepted) {
        this.gameState.removeHelper();
      }
    }
  }

  removeHelper(): void {
    this.gameState.removeHelper();
  }

  lootRoom(): void {
    this.audioService.play('card-draw');
    this.gameState.lootRoom();
  }

  playCard(cardId: string): void {
    const s = this.state();
    if (s?.turnPhase === 'charity') {
      const info = this.charityInfo();
      if (info && info.excess > 0) {
        this.gameState.discardFromHand(cardId);
        return;
      }
      const current = this.selectedForSale();
      if (current.includes(cardId)) {
        this.selectedForSale.set(current.filter(id => id !== cardId));
      } else {
        this.selectedForSale.set([...current, cardId]);
      }
      return;
    }
    this.gameState.playCardFromHand(cardId);
  }

  sellSelected(): void {
    const ids = this.selectedForSale();
    if (ids.length > 0) {
      this.gameState.sellCards(ids);
      this.selectedForSale.set([]);
    }
  }

  endTurn(): void {
    const success = this.gameState.endTurn();
    if (success) {
      this.selectedForSale.set([]);
      this.runBotTurns();
    }
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
