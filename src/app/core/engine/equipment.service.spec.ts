import { TestBed } from '@angular/core/testing';
import { EquipmentService } from './equipment.service';
import { EquipmentCard, Player, createPlayer, EMPTY_EQUIPMENT } from '../models';

function makeEquipment(overrides: Partial<EquipmentCard> = {}): EquipmentCard {
  return {
    id: 'e-test',
    name: 'Test Equipment',
    type: 'equipment',
    deck: 'treasure',
    description: 'test',
    bonus: 2,
    slot: 'hand',
    goldValue: 200,
    ...overrides,
  };
}

describe('EquipmentService', () => {
  let service: EquipmentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EquipmentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('canEquip', () => {
    it('should allow equipping when no restrictions', () => {
      const player = createPlayer('p1', 'Test', true);
      const card = makeEquipment();
      expect(service.canEquip(player, card)).toBe(true);
    });

    it('should deny equipping with wrong class', () => {
      const player = createPlayer('p1', 'Test', true);
      const card = makeEquipment({ classRestriction: 'warrior' });
      expect(service.canEquip(player, card)).toBe(false);
    });

    it('should allow equipping with matching class', () => {
      const player = { ...createPlayer('p1', 'Test', true), className: 'warrior' as const };
      const card = makeEquipment({ classRestriction: 'warrior' });
      expect(service.canEquip(player, card)).toBe(true);
    });

    it('should deny equipping with wrong race', () => {
      const player = createPlayer('p1', 'Test', true);
      const card = makeEquipment({ raceRestriction: 'dwarf' });
      expect(service.canEquip(player, card)).toBe(false);
    });
  });

  describe('equip', () => {
    it('should equip to empty hand slot', () => {
      const card = makeEquipment({ id: 'sword', slot: 'hand' });
      const player = { ...createPlayer('p1', 'Test', true), hand: [card] };
      const result = service.equip(player, card);
      expect(result.player.equipment.handLeft?.id).toBe('sword');
      expect(result.unequipped.length).toBe(0);
    });

    it('should equip to head slot and remove existing', () => {
      const oldHelm = makeEquipment({ id: 'old-helm', slot: 'head' });
      const newHelm = makeEquipment({ id: 'new-helm', slot: 'head' });
      const player: Player = {
        ...createPlayer('p1', 'Test', true),
        equipment: { ...EMPTY_EQUIPMENT, head: oldHelm },
        hand: [newHelm],
      };
      const result = service.equip(player, newHelm);
      expect(result.player.equipment.head?.id).toBe('new-helm');
      expect(result.unequipped.length).toBe(1);
      expect(result.unequipped[0]?.id).toBe('old-helm');
    });

    it('should equip two-handed weapon removing both hands', () => {
      const sword = makeEquipment({ id: 'sword', slot: 'hand' });
      const shield = makeEquipment({ id: 'shield', slot: 'hand' });
      const axe = makeEquipment({ id: 'axe', slot: 'two-hands', bonus: 4 });
      const player: Player = {
        ...createPlayer('p1', 'Test', true),
        equipment: { ...EMPTY_EQUIPMENT, handLeft: sword, handRight: shield },
        hand: [axe],
      };
      const result = service.equip(player, axe);
      expect(result.player.equipment.handLeft?.id).toBe('axe');
      expect(result.player.equipment.handRight).toBeNull();
      expect(result.unequipped.length).toBe(2);
    });
  });

  describe('getEquipmentBonus', () => {
    it('should return 0 for empty equipment', () => {
      expect(service.getEquipmentBonus(EMPTY_EQUIPMENT)).toBe(0);
    });

    it('should sum all equipment bonuses', () => {
      const equipment = {
        head: makeEquipment({ bonus: 1, slot: 'head' }),
        body: makeEquipment({ bonus: 3, slot: 'body' }),
        feet: null,
        handLeft: makeEquipment({ bonus: 2, slot: 'hand' }),
        handRight: null,
      };
      expect(service.getEquipmentBonus(equipment)).toBe(6);
    });
  });

  describe('getAllEquipped', () => {
    it('should return only non-null equipment', () => {
      const equipment = {
        head: makeEquipment({ id: 'h', slot: 'head' }),
        body: null,
        feet: null,
        handLeft: makeEquipment({ id: 'w', slot: 'hand' }),
        handRight: null,
      };
      expect(service.getAllEquipped(equipment).length).toBe(2);
    });
  });
});
