import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CombatState, Player, OneShotCard, getCombatStrength } from '../../core/models';

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
            @if (oneShotBonus() > 0) {
              + Предметы {{ oneShotBonus() }}
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
    .one-shots { margin: 8px 0; }
    .one-shots-title { font-size: 12px; margin-bottom: 4px; }
    .one-shots button {
      margin: 2px 4px;
      padding: 2px 8px;
      font-size: 12px;
      cursor: pointer;
      background: #e0f7fa;
      border: 1px solid #00838f;
      border-radius: 4px;
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
  readonly fight = output<void>();
  readonly run = output<void>();
  readonly useItem = output<string>();

  readonly equipBonus = computed(() => {
    const eq = this.player().equipment;
    return (eq.head?.bonus ?? 0) + (eq.body?.bonus ?? 0) + (eq.feet?.bonus ?? 0) +
      (eq.handLeft?.bonus ?? 0) + (eq.handRight?.bonus ?? 0);
  });

  readonly oneShotBonus = computed(() =>
    this.combat().playerBonuses.reduce((sum, c) => sum + c.bonus, 0)
  );

  readonly playerStrength = computed(() =>
    getCombatStrength(this.player()) + this.oneShotBonus()
  );

  readonly monsterStrength = computed(() =>
    this.combat().monster.level + this.combat().monsterBonuses
  );

  readonly oneShots = computed(() =>
    this.player().hand.filter((c): c is OneShotCard => c.type === 'one-shot' && c.usableInCombat)
  );
}
