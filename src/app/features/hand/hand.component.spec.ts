import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HandComponent } from './hand.component';
import { Card } from '../../core/models';

const testCards: Card[] = [
  {
    id: 'c1', name: 'Меч', type: 'equipment', deck: 'treasure',
    description: 'Острый меч', bonus: 3, slot: 'hand', goldValue: 400,
  },
  {
    id: 'c2', name: 'Шлем', type: 'equipment', deck: 'treasure',
    description: 'Защитный шлем', bonus: 1, slot: 'head', goldValue: 200,
  },
];

describe('HandComponent', () => {
  let fixture: ComponentFixture<HandComponent>;
  let component: HandComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HandComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HandComponent);
    fixture.componentRef.setInput('cards', testCards);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display all cards', () => {
    const cardEls = fixture.debugElement.queryAll(By.css('app-card'));
    expect(cardEls.length).toBe(2);
  });

  it('should show card count in title', () => {
    const title = fixture.debugElement.query(By.css('.hand-title'));
    expect(title.nativeElement.textContent).toContain('2');
  });

  it('should have no card selected initially', () => {
    expect(component.selectedId()).toBeNull();
  });

  it('should select a card via selectCard()', () => {
    component.selectCard('c1');
    fixture.detectChanges();

    expect(component.selectedId()).toBe('c1');
  });

  it('should deselect a card when selectCard() is called again', () => {
    component.selectCard('c1');
    fixture.detectChanges();
    component.selectCard('c1');
    fixture.detectChanges();

    expect(component.selectedId()).toBeNull();
  });

  it('should show play button when a card is selected', () => {
    component.selectCard('c1');
    fixture.detectChanges();

    const playBtn = fixture.debugElement.query(By.css('.play-btn'));
    expect(playBtn).toBeTruthy();
  });

  it('should not show play button without selection', () => {
    const playBtn = fixture.debugElement.query(By.css('.play-btn'));
    expect(playBtn).toBeNull();
  });

  it('should emit playCard event when play button is clicked', () => {
    const emitted: string[] = [];
    component.playCard.subscribe((id: string) => emitted.push(id));

    component.selectCard('c1');
    fixture.detectChanges();

    const playBtn = fixture.debugElement.query(By.css('.play-btn'));
    playBtn!.nativeElement.click();

    expect(emitted).toEqual(['c1']);
  });

  it('should render empty hand with 0 cards', () => {
    fixture.componentRef.setInput('cards', []);
    fixture.detectChanges();

    const cardEls = fixture.debugElement.queryAll(By.css('app-card'));
    expect(cardEls.length).toBe(0);
    const title = fixture.debugElement.query(By.css('.hand-title'));
    expect(title.nativeElement.textContent).toContain('0');
  });
});
