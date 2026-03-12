export type CardType = 'monster' | 'curse' | 'class' | 'race' | 'equipment' | 'one-shot' | 'level-up';

export type EquipmentSlot = 'head' | 'body' | 'feet' | 'hand' | 'two-hands';

export type DeckType = 'door' | 'treasure';

export interface BaseCard {
  readonly id: string;
  readonly name: string;
  readonly type: CardType;
  readonly deck: DeckType;
  readonly description: string;
}

export interface MonsterCard extends BaseCard {
  readonly type: 'monster';
  readonly deck: 'door';
  readonly level: number;
  readonly treasures: number;
  readonly levelsGained: number;
  readonly badStuff: string;
  readonly undead?: boolean;
}

export interface CurseCard extends BaseCard {
  readonly type: 'curse';
  readonly deck: 'door';
  readonly effect: CurseEffect;
}

export type CurseEffect =
  | { readonly kind: 'lose-level'; readonly levels: number }
  | { readonly kind: 'lose-equipment'; readonly slot?: EquipmentSlot }
  | { readonly kind: 'lose-hand' }
  | { readonly kind: 'lose-class' }
  | { readonly kind: 'lose-race' };

export type ClassName = 'warrior' | 'wizard' | 'thief' | 'cleric';

export interface ClassCard extends BaseCard {
  readonly type: 'class';
  readonly deck: 'door';
  readonly className: ClassName;
}

export type RaceName = 'elf' | 'dwarf' | 'halfling';

export interface RaceCard extends BaseCard {
  readonly type: 'race';
  readonly deck: 'door';
  readonly raceName: RaceName;
}

export interface EquipmentCard extends BaseCard {
  readonly type: 'equipment';
  readonly deck: 'treasure';
  readonly bonus: number;
  readonly slot: EquipmentSlot;
  readonly classRestriction?: ClassName;
  readonly raceRestriction?: RaceName;
  readonly goldValue: number;
}

export interface OneShotCard extends BaseCard {
  readonly type: 'one-shot';
  readonly deck: 'treasure';
  readonly bonus: number;
  readonly usableInCombat: boolean;
  readonly goldValue: number;
}

export interface LevelUpCard extends BaseCard {
  readonly type: 'level-up';
  readonly deck: 'treasure';
  readonly goldValue: number;
}

export type DoorCard = MonsterCard | CurseCard | ClassCard | RaceCard;
export type TreasureCard = EquipmentCard | OneShotCard | LevelUpCard;
export type Card = DoorCard | TreasureCard;
