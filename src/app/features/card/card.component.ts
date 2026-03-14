import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { Card, EquipmentSlot, ClassName, RaceName } from '../../core/models';

const TYPE_LABELS: Record<string, string> = {
  monster: 'Монстр',
  curse: 'Проклятие',
  class: 'Класс',
  race: 'Раса',
  equipment: 'Экипировка',
  'one-shot': 'Одноразовое',
  'level-up': 'Уровень',
};

const SLOT_NAMES: Record<EquipmentSlot, string> = {
  head: 'Голова',
  body: 'Тело',
  feet: 'Ноги',
  hand: 'Рука',
  'two-hands': 'Обе руки',
};

const CLASS_LABELS: Record<ClassName, string> = {
  warrior: 'Воин',
  wizard: 'Волшебник',
  thief: 'Вор',
  cleric: 'Клирик',
};

const RACE_LABELS: Record<RaceName, string> = {
  elf: 'Эльф',
  dwarf: 'Дварф',
  halfling: 'Халфлинг',
};

const CLASS_ABILITIES: Record<ClassName, string> = {
  warrior: 'Берсерк — тратьте карты из руки, каждая даёт +1 в бою',
  wizard: 'Чары — сбросьте 3 карты для автоматического побега из боя',
  thief: 'Удар в спину — бросьте кубик 4+, украдите карту у другого игрока (неудача: −1 уровень)',
  cleric: '+3 к боевой силе против нежити',
};

const RACE_ABILITIES: Record<RaceName, string> = {
  elf: '+1 уровень за каждую победу в бою',
  dwarf: '6 карт на руке вместо 5',
  halfling: 'Продаёт предметы по двойной цене (1000 зол. = 1 уровень вместо 2000)',
};

@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card" [class]="card().type" [class.selected]="selected()" (click)="cardClick.emit()">
      <button class="info-btn" (click)="toggleInfo($event)" title="Подробнее">?</button>
      <div class="card-type">{{ typeLabel() }}</div>
      <div class="card-name">{{ card().name }}</div>
      <div class="card-info">{{ infoLine() }}</div>
      <div class="card-desc">{{ card().description }}</div>
    </div>

    @if (showInfo()) {
      <div class="info-backdrop" (click)="showInfo.set(false)"></div>
      <div class="info-popup" [class]="'popup-' + card().type">
        <div class="info-popup-header">
          <span>{{ typeLabel() }}</span>
          <button class="info-close" (click)="showInfo.set(false)">×</button>
        </div>
        <div class="info-type-desc">{{ typeDescription() }}</div>
        <div class="info-details">
          @for (line of detailLines(); track line) {
            <div class="info-detail">{{ line }}</div>
          }
        </div>
      </div>
    }
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
      position: relative;
    }
    .card.selected { border-color: #0066cc; box-shadow: 0 0 6px rgba(0,102,204,0.5); }
    .card-type { font-size: 10px; text-transform: uppercase; opacity: 0.7; padding-right: 16px; }
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

    .info-btn {
      position: absolute;
      top: 3px;
      right: 3px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1px solid #999;
      background: rgba(255,255,255,0.8);
      font-size: 10px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      line-height: 1;
      color: #555;
    }
    .info-btn:hover { background: #fff; border-color: #555; color: #222; }

    .info-backdrop {
      position: fixed;
      inset: 0;
      z-index: 999;
      background: rgba(0,0,0,0.2);
    }

    .info-popup {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
      background: #fff;
      border: 2px solid #666;
      border-radius: 8px;
      padding: 14px;
      min-width: 220px;
      max-width: 300px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      font-size: 13px;
    }
    .popup-monster { border-color: #c62828; }
    .popup-curse { border-color: #6a1b9a; }
    .popup-class { border-color: #1565c0; }
    .popup-race { border-color: #2e7d32; }
    .popup-equipment { border-color: #e65100; }
    .popup-one-shot { border-color: #00838f; }
    .popup-level-up { border-color: #f9a825; }

    .info-popup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-close {
      cursor: pointer;
      background: none;
      border: none;
      font-size: 18px;
      line-height: 1;
      padding: 0 2px;
      color: #555;
    }
    .info-close:hover { color: #000; }

    .info-type-desc {
      font-size: 11px;
      color: #555;
      margin-bottom: 10px;
      line-height: 1.4;
      font-style: italic;
    }

    .info-details { display: flex; flex-direction: column; gap: 4px; }
    .info-detail {
      font-size: 12px;
      color: #222;
      padding: 3px 0;
      border-bottom: 1px solid #eee;
      line-height: 1.3;
    }
    .info-detail:last-child { border-bottom: none; }
  `],
})
export class CardComponent {
  readonly card = input.required<Card>();
  readonly selected = input(false);
  readonly cardClick = output<void>();

  readonly showInfo = signal(false);

  toggleInfo(event: Event): void {
    event.stopPropagation();
    this.showInfo.update(v => !v);
  }

  typeLabel(): string {
    return TYPE_LABELS[this.card().type] ?? this.card().type;
  }

  infoLine(): string {
    const c = this.card();
    switch (c.type) {
      case 'monster': return `Уровень ${c.level} | Сокровищ: ${c.treasures}`;
      case 'equipment': return `+${c.bonus} | ${SLOT_NAMES[c.slot]} | ${c.goldValue}зол.`;
      case 'one-shot': return `+${c.bonus}`;
      case 'level-up': return '+1 уровень';
      default: return '';
    }
  }

  typeDescription(): string {
    switch (this.card().type) {
      case 'monster':
        return 'Монстр — противник в бою. Победа приносит уровень(и) и сокровища. Поражение применяет «плохое последствие».';
      case 'curse':
        return 'Проклятие — негативный эффект, применяется немедленно при вытягивании из колоды дверей.';
      case 'class':
        return 'Класс — определяет особые способности персонажа. Можно иметь только один класс одновременно.';
      case 'race':
        return 'Раса — определяет расовые бонусы персонажа. Можно иметь только одну расу одновременно.';
      case 'equipment':
        return 'Экипировка — надевается в соответствующий слот и увеличивает боевую силу персонажа.';
      case 'one-shot':
        return 'Одноразовое — используется один раз, затем сбрасывается в отбой. Некоторые можно применять прямо в бою.';
      case 'level-up':
        return 'Уровень — позволяет немедленно повысить уровень персонажа на 1.';
      default:
        return '';
    }
  }

  detailLines(): string[] {
    const c = this.card();
    switch (c.type) {
      case 'monster': {
        const lines = [
          `Уровень монстра: ${c.level}`,
          `Сокровищ за победу: ${c.treasures}`,
          `Уровней за победу: +${c.levelsGained}`,
          `Плохое последствие: ${c.badStuff}`,
        ];
        if (c.undead) lines.push('Особенность: Нежить (+3 для Клирика)');
        return lines;
      }
      case 'curse': {
        return [`Эффект: ${this.curseEffectText(c.effect)}`];
      }
      case 'class': {
        return [
          `Класс: ${CLASS_LABELS[c.className]}`,
          `Способность: ${CLASS_ABILITIES[c.className]}`,
        ];
      }
      case 'race': {
        return [
          `Раса: ${RACE_LABELS[c.raceName]}`,
          `Бонус: ${RACE_ABILITIES[c.raceName]}`,
        ];
      }
      case 'equipment': {
        const lines = [
          `Бонус к силе: +${c.bonus}`,
          `Слот: ${SLOT_NAMES[c.slot]}`,
          `Стоимость: ${c.goldValue} зол.`,
        ];
        if (c.slot === 'two-hands') lines.push('Двуручное: занимает оба слота рук');
        if (c.classRestriction) lines.push(`Только для: ${CLASS_LABELS[c.classRestriction]}`);
        if (c.raceRestriction) lines.push(`Только для расы: ${RACE_LABELS[c.raceRestriction]}`);
        if (c.effect) {
          switch (c.effect.kind) {
            case 'bonus-vs-undead': lines.push(`Против нежити: +${c.effect.value} к силе`); break;
            case 'run-bonus': lines.push(`Бонус побега: +${c.effect.value} к броску кубика`); break;
            case 'extra-treasure': lines.push(`За победу: +${c.effect.value} доп. сокровищ`); break;
          }
        }
        return lines;
      }
      case 'one-shot': {
        return [
          `Бонус: +${c.bonus}`,
          `В бою: ${c.usableInCombat ? 'Да, можно применить в бою' : 'Нельзя применить в бою'}`,
          `Стоимость: ${c.goldValue} зол.`,
        ];
      }
      case 'level-up': {
        return [
          '+1 уровень немедленно',
          `Стоимость: ${c.goldValue} зол.`,
        ];
      }
      default:
        return [];
    }
  }

  private curseEffectText(effect: import('../../core/models').CurseEffect): string {
    switch (effect.kind) {
      case 'lose-level':
        return `Теряете ${effect.levels} уровень(ей)`;
      case 'lose-equipment':
        return effect.slot
          ? `Теряете экипировку в слоте «${SLOT_NAMES[effect.slot]}»`
          : 'Теряете случайный предмет экипировки';
      case 'lose-hand':
        return 'Теряете все карты на руке';
      case 'lose-class':
        return 'Теряете класс персонажа';
      case 'lose-race':
        return 'Теряете расу персонажа';
    }
  }
}
