import { EquipmentCard, LevelUpCard, OneShotCard, TreasureCard } from '../core/models';

const equipment: EquipmentCard[] = [
  {
    id: 'e1', name: 'Ржавый Шлем', type: 'equipment', deck: 'treasure',
    description: 'Старый, но ещё крепкий',
    bonus: 1, slot: 'head', goldValue: 200,
  },
  {
    id: 'e2', name: 'Рогатый Шлем', type: 'equipment', deck: 'treasure',
    description: 'Впечатляет и защищает',
    bonus: 2, slot: 'head', goldValue: 400,
  },
  {
    id: 'e3', name: 'Кожаная Броня', type: 'equipment', deck: 'treasure',
    description: 'Базовая защита для тела',
    bonus: 1, slot: 'body', goldValue: 200,
  },
  {
    id: 'e4', name: 'Кольчуга', type: 'equipment', deck: 'treasure',
    description: 'Звенит при ходьбе, зато защищает',
    bonus: 3, slot: 'body', goldValue: 600,
  },
  {
    id: 'e5', name: 'Ботинки Бегства', type: 'equipment', deck: 'treasure',
    description: 'Помогают быстро убежать',
    bonus: 1, slot: 'feet', goldValue: 200,
  },
  {
    id: 'e6', name: 'Сапоги Топтуна', type: 'equipment', deck: 'treasure',
    description: 'Тяжёлые, но грозные',
    bonus: 2, slot: 'feet', goldValue: 400,
  },
  {
    id: 'e7', name: 'Короткий Меч', type: 'equipment', deck: 'treasure',
    description: 'Лёгкий и надёжный',
    bonus: 2, slot: 'hand', goldValue: 400,
  },
  {
    id: 'e8', name: 'Широкий Меч', type: 'equipment', deck: 'treasure',
    description: 'Длинный и острый',
    bonus: 3, slot: 'hand', goldValue: 600,
  },
  {
    id: 'e9', name: 'Двуручный Топор', type: 'equipment', deck: 'treasure',
    description: 'Занимает обе руки, зато мощный',
    bonus: 4, slot: 'two-hands', goldValue: 800,
  },
  {
    id: 'e10', name: 'Щит Отражения', type: 'equipment', deck: 'treasure',
    description: 'Отражает часть атак',
    bonus: 2, slot: 'hand', goldValue: 400,
  },
  {
    id: 'e11', name: 'Посох Мага', type: 'equipment', deck: 'treasure',
    description: 'Только для волшебников',
    bonus: 3, slot: 'hand', goldValue: 600, classRestriction: 'wizard',
  },
  {
    id: 'e12', name: 'Молот Воина', type: 'equipment', deck: 'treasure',
    description: 'Только для воинов',
    bonus: 4, slot: 'hand', goldValue: 800, classRestriction: 'warrior',
  },
  {
    id: 'e13', name: 'Плащ Вора', type: 'equipment', deck: 'treasure',
    description: 'Только для воров',
    bonus: 2, slot: 'body', goldValue: 400, classRestriction: 'thief',
  },
  {
    id: 'e14', name: 'Святой Символ', type: 'equipment', deck: 'treasure',
    description: 'Только для клириков',
    bonus: 3, slot: 'hand', goldValue: 600, classRestriction: 'cleric',
  },
  {
    id: 'e15', name: 'Корона Дварфа', type: 'equipment', deck: 'treasure',
    description: 'Только для дварфов',
    bonus: 3, slot: 'head', goldValue: 600, raceRestriction: 'dwarf',
  },
  {
    id: 'e16', name: 'Святая Вода', type: 'equipment', deck: 'treasure',
    description: 'Эффективна против нежити',
    bonus: 1, slot: 'hand', goldValue: 400,
    effect: { kind: 'bonus-vs-undead', value: 3 },
  },
  {
    id: 'e17', name: 'Серебряный Клинок', type: 'equipment', deck: 'treasure',
    description: 'Особенно опасен для нежити',
    bonus: 2, slot: 'hand', goldValue: 500,
    effect: { kind: 'bonus-vs-undead', value: 2 },
  },
  {
    id: 'e18', name: 'Сапоги Ветра', type: 'equipment', deck: 'treasure',
    description: 'Вы едва касаетесь земли',
    bonus: 1, slot: 'feet', goldValue: 350,
    effect: { kind: 'run-bonus', value: 2 },
  },
  {
    id: 'e19', name: 'Шляпа Удачи', type: 'equipment', deck: 'treasure',
    description: 'Всегда что-нибудь найдётся',
    bonus: 1, slot: 'head', goldValue: 400,
    effect: { kind: 'extra-treasure', value: 1 },
  },
  {
    id: 'e20', name: 'Зачарованный Плащ', type: 'equipment', deck: 'treasure',
    description: 'Придаёт прыткости',
    bonus: 2, slot: 'body', goldValue: 400,
    effect: { kind: 'run-bonus', value: 1 },
  },
  {
    id: 'e21', name: 'Амулет Жадности', type: 'equipment', deck: 'treasure',
    description: 'Монстры всегда носят лишнее',
    bonus: 0, slot: 'body', goldValue: 500,
    effect: { kind: 'extra-treasure', value: 2 },
  },
];

const oneShots: OneShotCard[] = [
  {
    id: 'os1', name: 'Зелье Силы', type: 'one-shot', deck: 'treasure',
    description: '+3 в бою (одноразовое)',
    bonus: 3, usableInCombat: true, goldValue: 200,
  },
  {
    id: 'os2', name: 'Зелье Ярости', type: 'one-shot', deck: 'treasure',
    description: '+2 в бою (одноразовое)',
    bonus: 2, usableInCombat: true, goldValue: 200,
  },
  {
    id: 'os3', name: 'Магический Свиток', type: 'one-shot', deck: 'treasure',
    description: '+5 в бою (одноразовое)',
    bonus: 5, usableInCombat: true, goldValue: 400,
  },
  {
    id: 'os4', name: 'Бомба', type: 'one-shot', deck: 'treasure',
    description: '+3 в бою (одноразовое)',
    bonus: 3, usableInCombat: true, goldValue: 300,
  },
  {
    id: 'os5', name: 'Электрическая Радуга', type: 'one-shot', deck: 'treasure',
    description: '+4 в бою (одноразовое)',
    bonus: 4, usableInCombat: true, goldValue: 300,
  },
  {
    id: 'os6', name: 'Амулет Защиты', type: 'one-shot', deck: 'treasure',
    description: '+1 в бою (одноразовое)',
    bonus: 1, usableInCombat: true, goldValue: 150,
  },
  {
    id: 'os7', name: 'Зелье Маны', type: 'one-shot', deck: 'treasure',
    description: '+2 в бою (одноразовое)',
    bonus: 2, usableInCombat: true, goldValue: 200,
  },
  {
    id: 'os8', name: 'Огненный Шар', type: 'one-shot', deck: 'treasure',
    description: '+3 в бою (одноразовое)',
    bonus: 3, usableInCombat: true, goldValue: 300,
  },
];

const levelUps: LevelUpCard[] = [
  {
    id: 'lu1', name: 'Подкуп Божества', type: 'level-up', deck: 'treasure',
    description: 'Получи 1 уровень',
    goldValue: 0,
  },
  {
    id: 'lu2', name: 'Взятка Стражу', type: 'level-up', deck: 'treasure',
    description: 'Получи 1 уровень',
    goldValue: 0,
  },
  {
    id: 'lu3', name: 'Наследство', type: 'level-up', deck: 'treasure',
    description: 'Получи 1 уровень',
    goldValue: 0,
  },
];

export const TREASURE_CARDS: readonly TreasureCard[] = [
  ...equipment,
  ...oneShots,
  ...levelUps,
];
