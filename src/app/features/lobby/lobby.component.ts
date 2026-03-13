import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/engine/game-state.service';

@Component({
  selector: 'app-lobby',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lobby">
      <h1>Манчкин</h1>
      <p>Карточная игра</p>

      <div class="settings">
        <label>Количество ботов:</label>
        <div class="bot-buttons">
          @for (n of botOptions; track n) {
            <button
              [class.active]="botCount() === n"
              (click)="botCount.set(n)"
            >{{ n }}</button>
          }
        </div>
        <p class="hint">Всего игроков: {{ botCount() + 1 }} (вы + {{ botCount() }} ботов)</p>
      </div>

      <button class="start-btn" (click)="startGame()">Начать игру</button>
    </div>
  `,
  styles: [`
    .lobby {
      max-width: 400px;
      margin: 60px auto;
      text-align: center;
      padding: 20px;
    }
    h1 { font-size: 36px; margin-bottom: 4px; }
    p { color: #666; }
    .settings { margin: 30px 0; }
    label { font-weight: bold; display: block; margin-bottom: 8px; }
    .bot-buttons { display: flex; gap: 8px; justify-content: center; }
    .bot-buttons button {
      width: 48px; height: 48px;
      font-size: 18px;
      cursor: pointer;
      border: 2px solid #ccc;
      border-radius: 8px;
      background: white;
    }
    .bot-buttons button.active {
      border-color: #1565c0;
      background: #e3f2fd;
      font-weight: bold;
    }
    .hint { font-size: 13px; margin-top: 8px; }
    .start-btn {
      padding: 12px 40px;
      font-size: 18px;
      cursor: pointer;
      background: #2e7d32;
      color: white;
      border: none;
      border-radius: 8px;
    }
  `],
})
export class LobbyComponent {
  readonly botOptions = [3, 4, 5];
  readonly botCount = signal(3);

  constructor(
    private readonly gameState: GameStateService,
    private readonly router: Router,
  ) {}

  startGame(): void {
    this.gameState.startGame(this.botCount());
    this.router.navigate(['/game']);
  }
}
