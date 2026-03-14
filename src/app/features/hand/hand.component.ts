import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { Card } from '../../core/models';
import { CardComponent } from '../card/card.component';

@Component({
  selector: 'app-hand',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent],
  template: `
    <div class="hand">
      <div class="hand-title">Рука ({{ cards().length }})</div>
      <div class="hand-cards">
        @for (card of cards(); track card.id) {
          <div class="hand-slot">
            <app-card
              [card]="card"
              [selected]="selectedId() === card.id"
              (cardClick)="selectCard(card.id)"
            />
            @if (selectedId() === card.id) {
              <button class="play-btn" (click)="playCard.emit(card.id)">Разыграть</button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .hand-title { font-weight: bold; margin-bottom: 6px; }
    .hand-cards { display: flex; gap: 8px; flex-wrap: wrap; }
    .hand-slot { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    @media (max-width: 768px) {
      .hand-cards { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 8px; }
    }
    .play-btn {
      padding: 2px 12px;
      font-size: 12px;
      cursor: pointer;
      background: #1565c0;
      color: white;
      border: none;
      border-radius: 4px;
    }
  `],
})
export class HandComponent {
  readonly cards = input.required<readonly Card[]>();
  readonly playCard = output<string>();
  readonly selectedId = signal<string | null>(null);

  selectCard(id: string): void {
    this.selectedId.set(this.selectedId() === id ? null : id);
  }
}
