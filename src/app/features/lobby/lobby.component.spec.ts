import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { LobbyComponent } from './lobby.component';
import { GameStateService } from '../../core/engine/game-state.service';

describe('LobbyComponent', () => {
  let fixture: ComponentFixture<LobbyComponent>;
  let component: LobbyComponent;
  let gameStateSpy: { startGame: ReturnType<typeof vi.fn> };
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    gameStateSpy = { startGame: vi.fn() };
    routerSpy = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LobbyComponent],
      providers: [
        { provide: GameStateService, useValue: gameStateSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LobbyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial bot count of 3', () => {
    expect(component.botCount()).toBe(3);
  });

  it('should display correct total player count', () => {
    const hint = fixture.debugElement.query(By.css('.hint'));
    expect(hint.nativeElement.textContent).toContain('4');
  });

  it('should update bot count when option button is clicked', () => {
    const buttons = fixture.debugElement.queryAll(By.css('.bot-buttons button'));
    const btn4 = buttons.find(b => b.nativeElement.textContent.trim() === '4');
    btn4!.nativeElement.click();
    fixture.detectChanges();

    expect(component.botCount()).toBe(4);
  });

  it('should mark active button with active class', () => {
    const buttons = fixture.debugElement.queryAll(By.css('.bot-buttons button'));
    const activeBtn = buttons.find(b => b.nativeElement.classList.contains('active'));
    expect(activeBtn!.nativeElement.textContent.trim()).toBe('3');
  });

  it('should call startGame and navigate on start button click', () => {
    const startBtn = fixture.debugElement.query(By.css('.start-btn'));
    startBtn.nativeElement.click();

    expect(gameStateSpy.startGame).toHaveBeenCalledWith(3);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/game']);
  });

  it('should pass updated bot count to startGame', () => {
    const buttons = fixture.debugElement.queryAll(By.css('.bot-buttons button'));
    const btn5 = buttons.find(b => b.nativeElement.textContent.trim() === '5');
    btn5!.nativeElement.click();
    fixture.detectChanges();

    const startBtn = fixture.debugElement.query(By.css('.start-btn'));
    startBtn.nativeElement.click();

    expect(gameStateSpy.startGame).toHaveBeenCalledWith(5);
  });
});
