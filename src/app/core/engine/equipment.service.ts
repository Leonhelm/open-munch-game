import { Injectable } from '@angular/core';
import { EquipmentCard, EquipmentSlot } from '../models';
import { Player, PlayerEquipment } from '../models';

@Injectable({ providedIn: 'root' })
export class EquipmentService {
  canEquip(player: Player, card: EquipmentCard): boolean {
    if (card.classRestriction && player.className !== card.classRestriction) {
      return false;
    }
    if (card.raceRestriction && player.raceName !== card.raceRestriction) {
      return false;
    }
    return true;
  }

  equip(player: Player, card: EquipmentCard): { player: Player; unequipped: EquipmentCard[] } {
    const unequipped: EquipmentCard[] = [];
    const equipment = { ...player.equipment };

    if (card.slot === 'two-hands') {
      if (equipment.handLeft) unequipped.push(equipment.handLeft);
      if (equipment.handRight) unequipped.push(equipment.handRight);
      equipment.handLeft = card;
      equipment.handRight = null;
    } else if (card.slot === 'hand') {
      if (!equipment.handLeft) {
        equipment.handLeft = card;
      } else if (!equipment.handRight) {
        if (equipment.handLeft.slot === 'two-hands') {
          unequipped.push(equipment.handLeft);
          equipment.handLeft = card;
        } else {
          equipment.handRight = card;
        }
      } else {
        unequipped.push(equipment.handLeft);
        equipment.handLeft = card;
      }
    } else {
      const existing = this.getFromSlot(equipment, card.slot);
      if (existing) unequipped.push(existing);
      this.setSlot(equipment, card.slot, card);
    }

    const newHand = player.hand.filter(c => c.id !== card.id);
    for (const u of unequipped) {
      newHand.push(u);
    }

    return {
      player: { ...player, equipment, hand: newHand },
      unequipped,
    };
  }

  unequipSlot(player: Player, slot: EquipmentSlot): { player: Player; card: EquipmentCard | null } {
    const equipment = { ...player.equipment };
    let card: EquipmentCard | null = null;

    if (slot === 'hand' || slot === 'two-hands') {
      card = equipment.handLeft;
      equipment.handLeft = equipment.handRight;
      equipment.handRight = null;
    } else {
      card = this.getFromSlot(equipment, slot);
      this.setSlot(equipment, slot, null);
    }

    const newHand = card ? [...player.hand, card] : [...player.hand];

    return {
      player: { ...player, equipment, hand: newHand },
      card,
    };
  }

  getEquipmentBonus(equipment: PlayerEquipment): number {
    const slots: (EquipmentCard | null)[] = [
      equipment.head,
      equipment.body,
      equipment.feet,
      equipment.handLeft,
      equipment.handRight,
    ];
    return slots.reduce((sum, c) => sum + (c?.bonus ?? 0), 0);
  }

  getAllEquipped(equipment: PlayerEquipment): EquipmentCard[] {
    return [
      equipment.head,
      equipment.body,
      equipment.feet,
      equipment.handLeft,
      equipment.handRight,
    ].filter((c): c is EquipmentCard => c !== null);
  }

  private getFromSlot(equipment: PlayerEquipment, slot: EquipmentSlot): EquipmentCard | null {
    switch (slot) {
      case 'head': return equipment.head;
      case 'body': return equipment.body;
      case 'feet': return equipment.feet;
      case 'hand': return equipment.handLeft;
      case 'two-hands': return equipment.handLeft;
    }
  }

  private setSlot(equipment: Record<string, EquipmentCard | null>, slot: EquipmentSlot, card: EquipmentCard | null): void {
    switch (slot) {
      case 'head': equipment['head'] = card; break;
      case 'body': equipment['body'] = card; break;
      case 'feet': equipment['feet'] = card; break;
      case 'hand': equipment['handLeft'] = card; break;
      case 'two-hands':
        equipment['handLeft'] = card;
        equipment['handRight'] = null;
        break;
    }
  }
}
