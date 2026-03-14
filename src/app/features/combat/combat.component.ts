import { Component, ChangeDetectionStrategy, input, output, computed, signal } from '@angular/core';
import { CombatState, Player, OneShotCard, getCombatStrength, getClassCombatBonus } from '../../core/models';

@Component({
  selector: 'app-combat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="combat">
      <h3>Бой!</h3>
      <div class="combat-info">
        <div class="combat-side">
          <div class="combat-label">{{ player().name }}</div>
          <div class="combat-strength">{{ playerStrength() }}</div>
          <div class="combat-detail">
            Уровень {{ player().level }} + Экип. {{ equipBonus() }}
            @if (classCombatBonus() > 0) {
              + Клирик vs нежить {{ classCombatBonus() }}
            }
            @if (oneShotBonus() > 0) {
              + Предметы {{ oneShotBonus() }}
            }
            @if (combat().warriorBonuses > 0) {
              + Берсерк {{ combat().warriorBonuses }}
            }
            @if (helperStrength() > 0) {
              + Помощник {{ helperStrength() }}
            }
          </div>
        </div>
        <div class="combat-vs">VS</div>
        <div class="combat-side">
          <div class="combat-label">{{ combat().monster.name }}</div>
          <div class="combat-strength">{{ monsterStrength() }}</div>
          <div class="combat-detail">Уровень {{ combat().monster.level }}</div>
        </div>
      </div>

      @if (helperPlayer(); as hp) {
        <div class="helper-info">
          Помощник: {{ hp.name }} (Сила: {{ getCombatStr(hp) }})
          <button class="btn-remove-helper" (click)="removeHelper.emit()">Убрать</button>
        </div>
      }

      <div class="combat-result">
        @if (playerStrength() > monsterStrength()) {
          <span class="winning">Вы побеждаете!</span>
        } @else {
          <span class="losing">Монстр сильнее!</span>
        }
      </div>

      @if (oneShots().length > 0) {
        <div class="one-shots">
          <div class="one-shots-title">Использовать предмет:</div>
          @for (card of oneShots(); track card.id) {
            <button (click)="useItem.emit(card.id)">{{ card.name }} (+{{ card.bonus }})</button>
          }
        </div>
      }

      @if (isWarrior() && playerHandCards().length > 0) {
        <div class="class-ability">
          <div class="one-shots-title">Берсерк (сбросить карту за +1):</div>
          @for (card of playerHandCards(); track card.id) {
            <button (click)="berserk.emit(card.id)">{{ card.name }}</button>
          }
        </div>
      }

      @if (isWizard() && player().hand.length >= 3) {
        <div class="class-ability">
          <div class="one-shots-title">Чары (сбросить 3 карты для автопобега):</div>
          @for (card of player().hand; track card.id) {
            <button
              [class.selected]="charmSelected().includes(card.id)"
              (click)="toggleCharmCard(card.id)"
            >{{ card.name }}</button>
          }
          @if (charmSelected().length === 3) {
            <button class="btn-charm" (click)="wizardEscape.emit(charmSelected()); charmSelected.set([])">Применить Чары</button>
          }
        </div>
      }

      @if (!helperPlayer() && otherPlayers().length > 0) {
        <div class="helper-section">
          <div class="one-shots-title">Попросить помощь:</div>
          @for (p of otherPlayers(); track p.id) {
            <button (click)="askHelp.emit(p.id)">{{ p.name }} (Сила: {{ getCombatStr(p) }})</button>
          }
        </div>
      }

      <div class="combat-actions">
        <button class="btn-fight" (click)="fight.emit()">Сражаться</button>
        <button class="btn-run" (click)="run.emit()">Бежать</button>
      </div>
    </div>
  `,
  styles: [`
    .combat { border: 2px solid #c62828; border-radius: 8px; padding: 12px; background: #fff8f8; }
    h3 { margin: 0 0 8px; color: #c62828; }
    .combat-info { display: flex; align-items: center; gap: 16px; justify-content: center; }
    .combat-side { text-align: center; }
    .combat-label { font-weight: bold; }
    .combat-strength { font-size: 32px; font-weight: bold; }
    .combat-detail { font-size: 12px; color: #666; }
    .combat-vs { font-size: 20px; font-weight: bold; color: #999; }
    .combat-result { text-align: center; margin: 8px 0; font-weight: bold; }
    .winning { color: #2e7d32; }
    .losing { color: #c62828; }
    .one-shots, .class-ability, .helper-section { margin: 8px 0; }
    .one-shots-title { font-size: 12px; margin-bottom: 4px; }
    .one-shots button, .class-ability button, .helper-section button {
      margin: 2px 4px;
      padding: 2px 8px;
      font-size: 12px;
      cursor: pointer;
      background: #e0f7fa;
      border: 1px solid #00838f;
      border-radius: 4px;
    }
    .class-ability button.selected { background: #b2ebf2; border-color: #006064; font-weight: bold; }
    .btn-charm { background: #7c4dff !important; color: white !important; border-color: #651fff !important; }
    .helper-info {
      text-align: center; margin: 6px 0; padding: 4px 8px;
      background: #e8f5e9; border-radius: 4px; font-size: 13px;
    }
    .btn-remove-helper {
      margin-left: 8px; padding: 1px 6px; font-size: 11px;
      cursor: pointer; background: #ffcdd2; border: 1px solid #c62828; border-radius: 3px;
    }
    .combat-actions { display: flex; gap: 8px; margin-top: 8px; }
    .btn-fight {
      flex: 1; padding: 8px; cursor: pointer;
      background: #2e7d32; color: white; border: none; border-radius: 4px; font-size: 14px;
    }
    .btn-run {
      flex: 1; padding: 8px; cursor: pointer;
      background: #e65100; color: white; border: none; border-radius: 4px; font-size: 14px;
    }
  `],
})
export class CombatComponent {
  readonly combat = input.required<CombatState>();
  readonly player = input.required<Player>();
  readonly allPlayers = input<readonly Player[]>([]);
  readonly fight = output<void>();
  readonly run = output<void>();
  readonly useItem = output<string>();
  readonly berserk = output<string>();
  readonly wizardEscape = output<string[]>();
  readonly askHelp = output<string>();
  readonly removeHelper = output<void>();

  readonly charmSelected = signal<string[]>([]);

  readonly equipBonus = computed(() => {
    const eq = this.player().equipment;
    return (eq.head?.bonus ?? 0) + (eq.body?.bonus ?? 0) + (eq.feet?.bonus ?? 0) +
      (eq.handLeft?.bonus ?? 0) + (eq.handRight?.bonus ?? 0);
  });

  readonly classCombatBonus = computed(() =>
    getClassCombatBonus(this.player(), this.combat().monster)
  );

  readonly oneShotBonus = computed(() =>
    this.combat().playerBonuses.reduce((sum, c) => sum + c.bonus, 0)
  );

  readonly helperPlayer = computed(() => {
    const hid = this.combat().helperId;
    if (!hid) return null;
    return this.allPlayers().find(p => p.id === hid) ?? null;
  });

  readonly helperStrength = computed(() => {
    const hp = this.helperPlayer();
    if (!hp) return 0;
    return getCombatStrength(hp) +
      this.combat().helperBonuses.reduce((sum, c) => sum + c.bonus, 0);
  });

  readonly playerStrength = computed(() =>
    getCombatStrength(this.player()) + this.oneShotBonus() +
    this.classCombatBonus() + this.combat().warriorBonuses + this.helperStrength()
  );

  readonly monsterStrength = computed(() =>
    this.combat().monster.level + this.combat().monsterBonuses
  );

  readonly oneShots = computed(() =>
    this.player().hand.filter((c): c is OneShotCard => c.type === 'one-shot' && c.usableInCombat)
  );

  readonly isWarrior = computed(() => this.player().className === 'warrior');
  readonly isWizard = computed(() => this.player().className === 'wizard');

  readonly playerHandCards = computed(() =>
    this.player().hand.filter(c => c.type !== 'one-shot')
  );

  readonly otherPlayers = computed(() =>
    this.allPlayers().filter(p => p.id !== this.player().id)
  );

  getCombatStr(p: Player): number {
    return getCombatStrength(p);
  }

  toggleCharmCard(cardId: string): void {
    const current = this.charmSelected();
    if (current.includes(cardId)) {
      this.charmSelected.set(current.filter(id => id !== cardId));
    } else if (current.length < 3) {
      this.charmSelected.set([...current, cardId]);
    }
  }
}
