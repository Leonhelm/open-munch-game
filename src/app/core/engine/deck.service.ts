import { Injectable } from '@angular/core';
import { BaseCard } from '../models';

export interface Deck<T extends BaseCard> {
  cards: T[];
  discard: T[];
}

@Injectable({ providedIn: 'root' })
export class DeckService {
  createDeck<T extends BaseCard>(cards: readonly T[]): Deck<T> {
    return {
      cards: this.shuffle([...cards]),
      discard: [],
    };
  }

  draw<T extends BaseCard>(deck: Deck<T>): T | null {
    if (deck.cards.length === 0) {
      if (deck.discard.length === 0) {
        return null;
      }
      deck.cards = this.shuffle([...deck.discard]);
      deck.discard = [];
    }
    return deck.cards.pop() ?? null;
  }

  discard<T extends BaseCard>(deck: Deck<T>, card: T): void {
    deck.discard.push(card);
  }

  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j]!, array[i]!];
    }
    return array;
  }

  remaining<T extends BaseCard>(deck: Deck<T>): number {
    return deck.cards.length;
  }

  discardPileSize<T extends BaseCard>(deck: Deck<T>): number {
    return deck.discard.length;
  }
}
