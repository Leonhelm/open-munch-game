import { ClassCard, CurseCard, DoorCard, MonsterCard, RaceCard } from '../core/models';

const monsters: MonsterCard[] = [
  {
    id: 'm1', name: 'Потлвинная Крыса', type: 'monster', deck: 'door',
    description: 'Мелкая, но злобная тварь из подземелья',
    level: 1, treasures: 1, levelsGained: 1, badStuff: 'Укусила за палец. Потеряй 1 уровень.',
  },
  {
    id: 'm2', name: 'Летучие Бизоны', type: 'monster', deck: 'door',
    description: 'Стадо летающих бизонов заполнило коридор',
    level: 2, treasures: 1, levelsGained: 1, badStuff: 'Затоптали! Потеряй 1 уровень.',
  },
  {
    id: 'm3', name: 'Гнусные Гномики', type: 'monster', deck: 'door',
    description: 'Компания злобных садовых гномов',
    level: 4, treasures: 1, levelsGained: 1, badStuff: 'Утащили экипировку с головы.',
  },
  {
    id: 'm4', name: 'Гарпии', type: 'monster', deck: 'door',
    description: 'Крылатые создания с отвратительным голосом',
    level: 6, treasures: 2, levelsGained: 1, badStuff: 'Оглушили пением. Потеряй 2 уровня.',
  },
  {
    id: 'm5', name: 'Нос-о-Рог', type: 'monster', deck: 'door',
    description: 'Огромный носорог с бронированной шкурой',
    level: 8, treasures: 2, levelsGained: 1, badStuff: 'Растоптал! Потеряй 2 уровня.',
  },
  {
    id: 'm6', name: 'Огнедышащий Хомяк', type: 'monster', deck: 'door',
    description: 'Милый, пока не откроет рот',
    level: 3, treasures: 1, levelsGained: 1, badStuff: 'Подпалил бороду. Потеряй 1 уровень.',
  },
  {
    id: 'm7', name: 'Амазонки', type: 'monster', deck: 'door',
    description: 'Отряд воинственных женщин',
    level: 8, treasures: 2, levelsGained: 1, badStuff: 'Захватили в плен! Потеряй все карты в руке.',
  },
  {
    id: 'm8', name: 'Скелет', type: 'monster', deck: 'door',
    description: 'Костяной воин из подземелья',
    level: 2, treasures: 1, levelsGained: 1, badStuff: 'Поцарапал костью. Потеряй 1 уровень.', undead: true,
  },
  {
    id: 'm9', name: 'Зомби', type: 'monster', deck: 'door',
    description: 'Медленный, но настойчивый',
    level: 4, treasures: 1, levelsGained: 1, badStuff: 'Заразил! Потеряй 1 уровень.', undead: true,
  },
  {
    id: 'm10', name: 'Дракон', type: 'monster', deck: 'door',
    description: 'Огромный огнедышащий ящер',
    level: 14, treasures: 4, levelsGained: 2, badStuff: 'Испепелил! Потеряй всю экипировку.',
  },
  {
    id: 'm11', name: 'Тролль', type: 'monster', deck: 'door',
    description: 'Огромный и тупой, но очень сильный',
    level: 10, treasures: 3, levelsGained: 1, badStuff: 'Сломал ноги! Потеряй обувь.',
  },
  {
    id: 'm12', name: 'Медуза Горгона', type: 'monster', deck: 'door',
    description: 'Не смотри ей в глаза!',
    level: 10, treasures: 2, levelsGained: 1, badStuff: 'Окаменел на 1 ход. Пропусти ход.',
  },
  {
    id: 'm13', name: 'Бродячий Мим', type: 'monster', deck: 'door',
    description: 'Молчаливый, но смертельно скучный',
    level: 1, treasures: 1, levelsGained: 1, badStuff: 'Нагнал тоску. Потеряй 1 уровень.',
  },
  {
    id: 'm14', name: 'Зловещий Туман', type: 'monster', deck: 'door',
    description: 'Пронизывает до костей',
    level: 6, treasures: 2, levelsGained: 1, badStuff: 'Простыл. Потеряй 1 уровень.',
  },
  {
    id: 'm15', name: 'Каменный Голем', type: 'monster', deck: 'door',
    description: 'Ходячая каменная глыба',
    level: 12, treasures: 3, levelsGained: 1, badStuff: 'Раздавил! Потеряй 3 уровня.',
  },
];

const curses: CurseCard[] = [
  {
    id: 'c1', name: 'Проклятие Неуклюжести', type: 'curse', deck: 'door',
    description: 'Ты роняешь всё, что держишь в руках',
    effect: { kind: 'lose-equipment', slot: 'hand' },
  },
  {
    id: 'c2', name: 'Утиная Напасть', type: 'curse', deck: 'door',
    description: 'Утки украли твой головной убор',
    effect: { kind: 'lose-equipment', slot: 'head' },
  },
  {
    id: 'c3', name: 'Потеря Уровня', type: 'curse', deck: 'door',
    description: 'Просто невезение',
    effect: { kind: 'lose-level', levels: 1 },
  },
  {
    id: 'c4', name: 'Кризис Идентичности', type: 'curse', deck: 'door',
    description: 'Ты забыл, кто ты',
    effect: { kind: 'lose-class' },
  },
  {
    id: 'c5', name: 'Проклятие Амнезии', type: 'curse', deck: 'door',
    description: 'Забыл откуда ты',
    effect: { kind: 'lose-race' },
  },
];

const classes: ClassCard[] = [
  {
    id: 'cl1', name: 'Воин', type: 'class', deck: 'door',
    description: 'Сила — главный аргумент. Можно сбрасывать карты для +1 в бою.',
    className: 'warrior',
  },
  {
    id: 'cl2', name: 'Волшебник', type: 'class', deck: 'door',
    description: 'Знание — сила. Можно сбрасывать карты чтобы убежать от монстра.',
    className: 'wizard',
  },
  {
    id: 'cl3', name: 'Вор', type: 'class', deck: 'door',
    description: 'Ловкость рук. Можно воровать карты у других игроков.',
    className: 'thief',
  },
  {
    id: 'cl4', name: 'Клирик', type: 'class', deck: 'door',
    description: 'Вера — щит. Бонус +3 против нежити.',
    className: 'cleric',
  },
];

const races: RaceCard[] = [
  {
    id: 'r1', name: 'Эльф', type: 'race', deck: 'door',
    description: 'Элегантный и быстрый. +1 уровень за каждого побеждённого монстра.',
    raceName: 'elf',
  },
  {
    id: 'r2', name: 'Дварф', type: 'race', deck: 'door',
    description: 'Коренастый и крепкий. Может нести 6 карт в руке.',
    raceName: 'dwarf',
  },
  {
    id: 'r3', name: 'Халфлинг', type: 'race', deck: 'door',
    description: 'Маленький, но удачливый. Может продать 1 карту за 1 уровень.',
    raceName: 'halfling',
  },
];

export const DOOR_CARDS: readonly DoorCard[] = [
  ...monsters,
  ...curses,
  ...classes,
  ...races,
];
