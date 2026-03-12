import { Card, ClassName, EquipmentCard, EquipmentSlot, RaceName } from './card.model';

export interface PlayerEquipment {
  readonly head: EquipmentCard | null;
  readonly body: EquipmentCard | null;
  readonly feet: EquipmentCard | null;
  readonly handLeft: EquipmentCard | null;
  readonly handRight: EquipmentCard | null;
}

export const EMPTY_EQUIPMENT: PlayerEquipment = {
  head: null,
  body: null,
  feet: null,
  handLeft: null,
  handRight: null,
};

export interface Player {
  readonly id: string;
  readonly name: string;
  readonly isHuman: boolean;
  readonly level: number;
  readonly hand: readonly Card[];
  readonly equipment: PlayerEquipment;
  readonly className: ClassName | null;
  readonly raceName: RaceName | null;
}

export function createPlayer(id: string, name: string, isHuman: boolean): Player {
  return {
    id,
    name,
    isHuman,
    level: 1,
    hand: [],
    equipment: EMPTY_EQUIPMENT,
    className: null,
    raceName: null,
  };
}

export function getEquipmentBonus(equipment: PlayerEquipment): number {
  const slots: (EquipmentCard | null)[] = [
    equipment.head,
    equipment.body,
    equipment.feet,
    equipment.handLeft,
    equipment.handRight,
  ];
  return slots.reduce((sum, card) => sum + (card?.bonus ?? 0), 0);
}

export function getCombatStrength(player: Player): number {
  return player.level + getEquipmentBonus(player.equipment);
}

export function getEquippedSlot(equipment: PlayerEquipment, slot: EquipmentSlot): EquipmentCard | null {
  switch (slot) {
    case 'head': return equipment.head;
    case 'body': return equipment.body;
    case 'feet': return equipment.feet;
    case 'hand': return equipment.handLeft;
    case 'two-hands': return equipment.handLeft;
  }
}
