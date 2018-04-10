module.exports = {
  categories: {
    ships: 'Player ship modules',
    'ship-abyssal': 'Enemy ship modules',
    bosses: 'Enemy boss ship modules',
    slotitem: 'Equipment modules',
    'slotitem-abyssal': 'Enemy equipment modules',
    useitem: 'Item modules',
    misc: 'Misc data modules',
  },
  merge: {
    bosses: 'ship-abyssal',
  },
  bot: {
    protocol: 'https',
    server: 'kancolle.wikia.com',
    concurrency: 100,
  },
  user: {
    name: '',
    password: '',
  },
}
