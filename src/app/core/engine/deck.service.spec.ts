import { TestBed } from '@angular/core/testing';
import { DeckService, Deck } from './deck.service';
import { BaseCard } from '../models';

function makeCard(id: string): BaseCard {
  return { id, name: `Card ${id}`, type: 'monster', deck: 'door', description: '' };
}

describe('DeckService', () => {
  let service: DeckService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeckService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createDeck', () => {
    it('should create a deck with all cards shuffled', () => {
      const cards = [makeCard('1'), makeCard('2'), makeCard('3')];
      const deck = service.createDeck(cards);
      expect(deck.cards.length).toBe(3);
      expect(deck.discard.length).toBe(0);
      expect(new Set(deck.cards.map(c => c.id))).toEqual(new Set(['1', '2', '3']));
    });

    it('should not modify the original array', () => {
      const cards = [makeCard('1'), makeCard('2')];
      service.createDeck(cards);
      expect(cards.length).toBe(2);
    });
  });

  describe('draw', () => {
    it('should draw a card from the deck', () => {
      const deck: Deck<BaseCard> = {
        cards: [makeCard('1'), makeCard('2')],
        discard: [],
      };
      const card = service.draw(deck);
      expect(card).toBeTruthy();
      expect(deck.cards.length).toBe(1);
    });

    it('should return null when deck and discard are empty', () => {
      const deck: Deck<BaseCard> = { cards: [], discard: [] };
      expect(service.draw(deck)).toBeNull();
    });

    it('should reshuffle discard pile when deck is empty', () => {
      const deck: Deck<BaseCard> = {
        cards: [],
        discard: [makeCard('1'), makeCard('2')],
      };
      const card = service.draw(deck);
      expect(card).toBeTruthy();
      expect(deck.discard.length).toBe(0);
      expect(deck.cards.length).toBe(1);
    });
  });

  describe('discard', () => {
    it('should add card to discard pile', () => {
      const deck: Deck<BaseCard> = { cards: [], discard: [] };
      service.discard(deck, makeCard('1'));
      expect(deck.discard.length).toBe(1);
    });
  });

  describe('shuffle', () => {
    it('should return array of same length', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = service.shuffle([...arr]);
      expect(result.length).toBe(arr.length);
      expect(new Set(result)).toEqual(new Set(arr));
    });
  });

  describe('remaining / discardPileSize', () => {
    it('should return correct counts', () => {
      const deck: Deck<BaseCard> = {
        cards: [makeCard('1'), makeCard('2')],
        discard: [makeCard('3')],
      };
      expect(service.remaining(deck)).toBe(2);
      expect(service.discardPileSize(deck)).toBe(1);
    });
  });
});
