import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CombatComponent } from './combat.component';
import { CombatState, Player, EMPTY_EQUIPMENT, createPlayer } from '../../core/models';

const testMonster = {
  id: 'm1', name: 'Гоблин', type: 'monster' as const, deck: 'door' as const,
  description: 'Маленький гоблин',
  level: 3, treasures: 1, levelsGained: 1,
  badStuff: 'Теряешь 1 уровень', badStuffEffect: { kind: 'lose-levels' as const, levels: 1 },
  undead: false,
};

const testCombat: CombatState = {
  monster: testMonster,
  playerBonuses: [],
  monsterBonuses: 0,
  helperId: null,
  helperBonuses: [],
  warriorBonuses: 0,
};

const testPlayer: Player = createPlayer('p1', 'Герой', true);

describe('CombatComponent', () => {
  let fixture: ComponentFixture<CombatComponent>;
  let component: CombatComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CombatComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CombatComponent);
    fixture.componentRef.setInput('combat', testCombat);
    fixture.componentRef.setInput('player', testPlayer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display monster name', () => {
    const text = fixture.debugElement.nativeElement.textContent;
    expect(text).toContain('Гоблин');
  });

  it('should display monster strength (level 3)', () => {
    expect(component.monsterStrength()).toBe(3);
  });

  it('should display player strength', () => {
    expect(component.playerStrength()).toBeGreaterThan(0);
  });

  it('should show winning indicator when player is stronger', () => {
    // Create player with level 10 to guarantee winning
    const strongPlayer: Player = { ...testPlayer, level: 10 };
    fixture.componentRef.setInput('player', strongPlayer);
    fixture.detectChanges();

    const winEl = fixture.debugElement.query(By.css('.winning'));
    expect(winEl).toBeTruthy();
  });

  it('should show losing indicator when monster is stronger', () => {
    // Monster level 3, player starts at level 1 — monster is stronger
    const weakPlayer: Player = { ...testPlayer, level: 1 };
    fixture.componentRef.setInput('player', weakPlayer);
    fixture.detectChanges();

    const loseEl = fixture.debugElement.query(By.css('.losing'));
    expect(loseEl).toBeTruthy();
  });

  it('should call fight.emit when fight button is clicked', () => {
    const spy = vi.spyOn(component.fight, 'emit');

    const fightBtn = fixture.debugElement.query(By.css('.btn-fight'));
    fightBtn.triggerEventHandler('click', new MouseEvent('click'));

    expect(spy).toHaveBeenCalled();
  });

  it('should call run.emit when run button is clicked', () => {
    const spy = vi.spyOn(component.run, 'emit');

    const runBtn = fixture.debugElement.query(By.css('.btn-run'));
    runBtn.triggerEventHandler('click', new MouseEvent('click'));

    expect(spy).toHaveBeenCalled();
  });

  it('should compute monsterStrength with monsterBonuses', () => {
    const combatWithBonus: CombatState = { ...testCombat, monsterBonuses: 5 };
    fixture.componentRef.setInput('combat', combatWithBonus);
    fixture.detectChanges();

    expect(component.monsterStrength()).toBe(8); // level 3 + bonus 5
  });

  it('should not show one-shot buttons when player has no one-shots', () => {
    const oneShots = fixture.debugElement.queryAll(By.css('.one-shots button'));
    expect(oneShots.length).toBe(0);
  });

  it('should call useItem.emit when one-shot button is clicked', () => {
    const oneShotPlayer: Player = {
      ...testPlayer,
      hand: [{
        id: 'os1', name: 'Зелье', type: 'one-shot', deck: 'treasure',
        description: 'Зелье силы', bonus: 3, usableInCombat: true, goldValue: 300,
      }],
    };
    fixture.componentRef.setInput('player', oneShotPlayer);
    fixture.detectChanges();

    const spy = vi.spyOn(component.useItem, 'emit');

    const oneShotBtn = fixture.debugElement.query(By.css('.one-shots button'));
    oneShotBtn.triggerEventHandler('click', new MouseEvent('click'));

    expect(spy).toHaveBeenCalledWith('os1');
  });
});
