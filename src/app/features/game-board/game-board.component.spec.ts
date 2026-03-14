import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameBoardComponent } from './game-board.component';
import { GameStateService } from '../../core/engine/game-state.service';
import { BotService } from '../../core/bot/bot.service';
import { EquipmentService } from '../../core/engine/equipment.service';
import { AudioService } from '../../shared/audio.service';
import { GameState, createPlayer, EMPTY_EQUIPMENT } from '../../core/models';

const humanPlayer = createPlayer('p1', 'Герой', true);
const botPlayer = createPlayer('p2', 'Бот', false);

const baseState: GameState = {
  players: [humanPlayer, botPlayer],
  currentPlayerIndex: 0,
  turnPhase: 'kick-door',
  doorDeck: [],
  doorDiscard: [],
  treasureDeck: [],
  treasureDiscard: [],
  combat: null,
  log: [{ text: 'Игра началась!', type: 'system' }],
  winnerId: null,
  thiefBackstabUsed: false,
  skipTurnPlayerIds: [],
};

describe('GameBoardComponent', () => {
  let fixture: ComponentFixture<GameBoardComponent>;
  let component: GameBoardComponent;
  let stateSignal: ReturnType<typeof signal<GameState | null>>;
  let gameStateSpy: Partial<GameStateService>;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    stateSignal = signal<GameState | null>(null);

    gameStateSpy = {
      state: stateSignal.asReadonly() as GameStateService['state'],
      kickDoor: vi.fn(),
      resolveCombat: vi.fn().mockReturnValue({ won: false, levelsGained: 0, treasures: 0 }),
      runAway: vi.fn().mockReturnValue(false),
      endTurn: vi.fn(),
      lootRoom: vi.fn(),
      playCardFromHand: vi.fn().mockReturnValue(false),
    } as Partial<GameStateService>;

    routerSpy = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [GameBoardComponent],
      providers: [
        { provide: GameStateService, useValue: gameStateSpy },
        { provide: BotService, useValue: { playBotTurn: vi.fn() } },
        { provide: EquipmentService, useValue: { getAllEquipped: vi.fn().mockReturnValue([]), canEquip: vi.fn().mockReturnValue(true) } },
        { provide: AudioService, useValue: { play: vi.fn(), toggle: vi.fn(), isEnabled: vi.fn().mockReturnValue(true) } },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GameBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not render board when state is null', () => {
    const board = fixture.debugElement.query(By.css('.board'));
    expect(board).toBeNull();
  });

  it('should render board when state is set', () => {
    stateSignal.set(baseState);
    fixture.detectChanges();

    const board = fixture.debugElement.query(By.css('.board'));
    expect(board).toBeTruthy();
  });

  it('should display player names from state', () => {
    stateSignal.set(baseState);
    fixture.detectChanges();

    const text = fixture.debugElement.nativeElement.textContent;
    expect(text).toContain('Герой');
    expect(text).toContain('Бот');
  });

  it('should show kick-door button during kick-door phase', () => {
    stateSignal.set(baseState);
    fixture.detectChanges();

    const text = fixture.debugElement.nativeElement.textContent;
    expect(text).toContain('Выбить дверь');
  });

  it('should show victory overlay when winnerId is set', () => {
    const wonState: GameState = { ...baseState, winnerId: 'p1' };
    stateSignal.set(wonState);
    fixture.detectChanges();

    const overlay = fixture.debugElement.query(By.css('.victory-overlay'));
    expect(overlay).toBeTruthy();
    expect(overlay.nativeElement.textContent).toContain('Победа');
  });

  it('should call kickDoor on service when button clicked', () => {
    stateSignal.set(baseState);
    fixture.detectChanges();

    const kickBtn = fixture.debugElement.queryAll(By.css('.action-btn'))
      .find(b => b.nativeElement.textContent.includes('Выбить'));
    kickBtn?.nativeElement.click();

    expect(gameStateSpy.kickDoor).toHaveBeenCalled();
  });

  it('should show log entries', () => {
    stateSignal.set(baseState);
    fixture.detectChanges();

    const text = fixture.debugElement.nativeElement.textContent;
    expect(text).toContain('Игра началась');
  });
});
