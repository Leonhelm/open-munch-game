import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { Card } from '../../core/models';

const TYPE_LABELS: Record<string, string> = {
  monster: 'Монстр',
  curse: 'Проклятие',
  class: 'Класс',
  race: 'Раса',
  equipment: 'Экипировка',
  'one-shot': 'Одноразовое',
  'level-up': 'Уровень',
};

@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card" [class]="card().type" [class.selected]="selected()" (click)="cardClick.emit()">
      <div class="card-type">{{ typeLabel() }}</div>
      <div class="card-name">{{ card().name }}</div>
      <div class="card-info">{{ infoLine() }}</div>
      <div class="card-desc">{{ card().description }}</div>
    </div>
  `,
  styles: [`
    .card {
      border: 2px solid #666;
      border-radius: 6px;
      padding: 6px 8px;
      min-width: 120px;
      max-width: 140px;
      font-size: 12px;
      cursor: pointer;
      background: #fff;
      user-select: none;
    }
    .card.selected { border-color: #0066cc; box-shadow: 0 0 6px rgba(0,102,204,0.5); }
    .card-type { font-size: 10px; text-transform: uppercase; opacity: 0.7; }
    .card-name { font-weight: bold; margin: 2px 0; }
    .card-info { font-size: 11px; color: #333; }
    .card-desc { font-size: 10px; color: #666; margin-top: 4px; }
    .monster { border-color: #c62828; background: #ffebee; }
    .curse { border-color: #6a1b9a; background: #f3e5f5; }
    .class { border-color: #1565c0; background: #e3f2fd; }
    .race { border-color: #2e7d32; background: #e8f5e9; }
    .equipment { border-color: #e65100; background: #fff3e0; }
    .one-shot { border-color: #00838f; background: #e0f7fa; }
    .level-up { border-color: #f9a825; background: #fffde7; }
  `],
})
export class CardComponent {
  readonly card = input.required<Card>();
  readonly selected = input(false);
  readonly cardClick = output<void>();

  typeLabel(): string {
    return TYPE_LABELS[this.card().type] ?? this.card().type;
  }

  infoLine(): string {
    const c = this.card();
    switch (c.type) {
      case 'monster': return `Уровень ${c.level} | Сокровищ: ${c.treasures}`;
      case 'equipment': return `+${c.bonus} | ${c.slot} | ${c.goldValue}зол.`;
      case 'one-shot': return `+${c.bonus}`;
      case 'level-up': return '+1 уровень';
      default: return '';
    }
  }
}
