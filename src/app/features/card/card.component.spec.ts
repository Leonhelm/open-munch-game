import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CardComponent } from './card.component';
import {
  MonsterCard,
  CurseCard,
  ClassCard,
  RaceCard,
  EquipmentCard,
  OneShotCard,
  LevelUpCard,
} from '../../core/models';

const monsterCard: MonsterCard = {
  id: 'm1', name: 'Дракон', type: 'monster', deck: 'door',
  description: 'Страшный дракон',
  level: 10, treasures: 3, levelsGained: 2,
  badStuff: 'Теряешь всё', badStuffEffect: { kind: 'lose-all-equipment' },
  undead: false,
};

const undeadMonster: MonsterCard = {
  ...monsterCard, id: 'm2', name: 'Зомби',
  undead: true,
  badStuffEffect: { kind: 'lose-levels', levels: 2 },
  badStuff: 'Теряешь 2 уровня',
};

const curseCard: CurseCard = {
  id: 'c1', name: 'Проклятие', type: 'curse', deck: 'door',
  description: 'Злое проклятие',
  effect: { kind: 'lose-level', levels: 2 },
};

const classCard: ClassCard = {
  id: 'cl1', name: 'Воин', type: 'class', deck: 'door',
  description: 'Класс воина', className: 'warrior',
};

const raceCard: RaceCard = {
  id: 'r1', name: 'Эльф', type: 'race', deck: 'door',
  description: 'Раса эльф', raceName: 'elf',
};

const equipCard: EquipmentCard = {
  id: 'e1', name: 'Меч', type: 'equipment', deck: 'treasure',
  description: 'Острый меч',
  bonus: 3, slot: 'hand', goldValue: 400,
};

const equipRestricted: EquipmentCard = {
  ...equipCard, id: 'e2', slot: 'two-hands',
  classRestriction: 'warrior', raceRestriction: 'dwarf',
};

const oneShotCard: OneShotCard = {
  id: 'o1', name: 'Зелье', type: 'one-shot', deck: 'treasure',
  description: 'Боевое зелье',
  bonus: 2, usableInCombat: true, goldValue: 300,
};

const levelUpCard: LevelUpCard = {
  id: 'lu1', name: '+1 Уровень', type: 'level-up', deck: 'treasure',
  description: 'Повышение уровня', goldValue: 0,
};

function createFixture<T extends MonsterCard | CurseCard | ClassCard | RaceCard | EquipmentCard | OneShotCard | LevelUpCard>(
  card: T
): ComponentFixture<CardComponent> {
  TestBed.configureTestingModule({ imports: [CardComponent] });
  const fixture = TestBed.createComponent(CardComponent);
  fixture.componentRef.setInput('card', card);
  fixture.detectChanges();
  return fixture;
}

describe('CardComponent', () => {
  it('should render card name', () => {
    const fixture = createFixture(monsterCard);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Дракон');
  });

  it('should render type label', () => {
    const fixture = createFixture(monsterCard);
    expect(fixture.nativeElement.textContent).toContain('Монстр');
  });

  it('should emit cardClick when card div clicked', () => {
    const fixture = createFixture(monsterCard);
    let clicked = false;
    fixture.componentInstance.cardClick.subscribe(() => clicked = true);
    fixture.debugElement.query(By.css('.card')).triggerEventHandler('click', new MouseEvent('click'));
    expect(clicked).toBe(true);
  });

  describe('info button', () => {
    it('should render info button', () => {
      const fixture = createFixture(monsterCard);
      const btn = fixture.debugElement.query(By.css('.info-btn'));
      expect(btn).toBeTruthy();
    });

    it('should show popup when info button clicked', () => {
      const fixture = createFixture(monsterCard);
      expect(fixture.debugElement.query(By.css('.info-popup'))).toBeNull();
      const btn = fixture.debugElement.query(By.css('.info-btn'));
      btn.triggerEventHandler('click', new MouseEvent('click'));
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('.info-popup'))).toBeTruthy();
    });

    it('should hide popup when close button clicked', () => {
      const fixture = createFixture(monsterCard);
      fixture.componentInstance.showInfo.set(true);
      fixture.detectChanges();
      const closeBtn = fixture.debugElement.query(By.css('.info-close'));
      closeBtn.triggerEventHandler('click', new MouseEvent('click'));
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('.info-popup'))).toBeNull();
    });

    it('should not emit cardClick when info button clicked', () => {
      const fixture = createFixture(monsterCard);
      let clicked = false;
      fixture.componentInstance.cardClick.subscribe(() => clicked = true);
      const btn = fixture.debugElement.query(By.css('.info-btn'));
      const event = new MouseEvent('click', { bubbles: true });
      btn.triggerEventHandler('click', event);
      expect(clicked).toBe(false);
    });
  });

  describe('typeDescription()', () => {
    it('returns non-empty for monster', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', monsterCard);
      expect(f.componentInstance.typeDescription()).toContain('Монстр');
    });

    it('returns non-empty for curse', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', curseCard);
      expect(f.componentInstance.typeDescription()).toContain('Проклятие');
    });

    it('returns non-empty for class', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', classCard);
      expect(f.componentInstance.typeDescription()).toContain('Класс');
    });

    it('returns non-empty for race', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', raceCard);
      expect(f.componentInstance.typeDescription()).toContain('Раса');
    });

    it('returns non-empty for equipment', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', equipCard);
      expect(f.componentInstance.typeDescription()).toContain('Экипировка');
    });

    it('returns non-empty for one-shot', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', oneShotCard);
      expect(f.componentInstance.typeDescription()).toContain('Одноразовое');
    });

    it('returns non-empty for level-up', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', levelUpCard);
      expect(f.componentInstance.typeDescription()).toContain('Уровень');
    });
  });

  describe('detailLines()', () => {
    it('monster: shows level, treasures, levelsGained, badStuff', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', monsterCard);
      const lines = f.componentInstance.detailLines();
      expect(lines.some(l => l.includes('10'))).toBe(true);
      expect(lines.some(l => l.includes('3'))).toBe(true);
      expect(lines.some(l => l.includes('2'))).toBe(true);
      expect(lines.some(l => l.includes('Теряешь всё'))).toBe(true);
    });

    it('undead monster: shows undead flag', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', undeadMonster);
      const lines = f.componentInstance.detailLines();
      expect(lines.some(l => l.toLowerCase().includes('нежить'))).toBe(true);
    });

    it('curse: shows effect description', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', curseCard);
      const lines = f.componentInstance.detailLines();
      expect(lines.some(l => l.includes('2'))).toBe(true);
    });

    it('class: shows class name and ability', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', classCard);
      const lines = f.componentInstance.detailLines();
      expect(lines.some(l => l.includes('Воин'))).toBe(true);
      expect(lines.some(l => l.includes('Берсерк'))).toBe(true);
    });

    it('race: shows race name and ability', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', raceCard);
      const lines = f.componentInstance.detailLines();
      expect(lines.some(l => l.includes('Эльф'))).toBe(true);
    });

    it('equipment: shows bonus, slot, gold', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', equipCard);
      const lines = f.componentInstance.detailLines();
      expect(lines.some(l => l.includes('+3'))).toBe(true);
      expect(lines.some(l => l.includes('Рука'))).toBe(true);
      expect(lines.some(l => l.includes('400'))).toBe(true);
    });

    it('equipment with restrictions: shows class and race restrictions', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', equipRestricted);
      const lines = f.componentInstance.detailLines();
      expect(lines.some(l => l.includes('Воин'))).toBe(true);
      expect(lines.some(l => l.includes('Дварф'))).toBe(true);
      expect(lines.some(l => l.toLowerCase().includes('двуручное'))).toBe(true);
    });

    it('one-shot: shows bonus, combat flag, gold', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', oneShotCard);
      const lines = f.componentInstance.detailLines();
      expect(lines.some(l => l.includes('+2'))).toBe(true);
      expect(lines.some(l => l.includes('Да'))).toBe(true);
      expect(lines.some(l => l.includes('300'))).toBe(true);
    });

    it('level-up: shows gold value', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', levelUpCard);
      const lines = f.componentInstance.detailLines();
      expect(lines.length).toBeGreaterThan(0);
    });
  });

  describe('curse effect text variants', () => {
    const makeCurse = (effect: CurseCard['effect']): CurseCard => ({
      id: 'cx', name: 'Проклятие', type: 'curse', deck: 'door',
      description: '', effect,
    });

    it('lose-equipment with slot', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', makeCurse({ kind: 'lose-equipment', slot: 'head' }));
      const lines = f.componentInstance.detailLines();
      expect(lines.some(l => l.includes('Голова'))).toBe(true);
    });

    it('lose-equipment without slot', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', makeCurse({ kind: 'lose-equipment' }));
      const lines = f.componentInstance.detailLines();
      expect(lines.some(l => l.includes('случайный'))).toBe(true);
    });

    it('lose-hand', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', makeCurse({ kind: 'lose-hand' }));
      const lines = f.componentInstance.detailLines();
      expect(lines.some(l => l.includes('руке'))).toBe(true);
    });

    it('lose-class', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', makeCurse({ kind: 'lose-class' }));
      const lines = f.componentInstance.detailLines();
      expect(lines.some(l => l.includes('класс'))).toBe(true);
    });

    it('lose-race', () => {
      TestBed.configureTestingModule({ imports: [CardComponent] });
      const f = TestBed.createComponent(CardComponent);
      f.componentRef.setInput('card', makeCurse({ kind: 'lose-race' }));
      const lines = f.componentInstance.detailLines();
      expect(lines.some(l => l.includes('расу'))).toBe(true);
    });
  });
});
