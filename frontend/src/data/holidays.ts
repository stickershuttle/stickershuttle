export interface Holiday {
  name: string;
  date: string; // YYYY-MM-DD format
  type: 'major' | 'minor' | 'commercial' | 'seasonal';
  color: string;
  emoji: string;
  description?: string;
}

// Generate holidays for current year and next year
const currentYear = new Date().getFullYear();
const nextYear = currentYear + 1;

export const holidays: Holiday[] = [
  // Major holidays
  {
    name: "New Year's Day",
    date: `${currentYear}-01-01`,
    type: 'major',
    color: '#FFD700',
    emoji: '🎉',
    description: 'Start the year with special deals'
  },
  {
    name: "New Year's Day",
    date: `${nextYear}-01-01`,
    type: 'major',
    color: '#FFD700',
    emoji: '🎉',
    description: 'Start the year with special deals'
  },
  
  // Valentine's Day
  {
    name: "Valentine's Day",
    date: `${currentYear}-02-14`,
    type: 'commercial',
    color: '#FF69B4',
    emoji: '💝',
    description: 'Love-themed sticker deals'
  },
  {
    name: "Valentine's Day",
    date: `${nextYear}-02-14`,
    type: 'commercial',
    color: '#FF69B4',
    emoji: '💝',
    description: 'Love-themed sticker deals'
  },

  // St. Patrick's Day
  {
    name: "St. Patrick's Day",
    date: `${currentYear}-03-17`,
    type: 'commercial',
    color: '#32CD32',
    emoji: '🍀',
    description: 'Green sticker specials'
  },
  {
    name: "St. Patrick's Day",
    date: `${nextYear}-03-17`,
    type: 'commercial',
    color: '#32CD32',
    emoji: '🍀',
    description: 'Green sticker specials'
  },

  // Easter (approximate dates - would need calculation for exact dates)
  {
    name: "Easter",
    date: `${currentYear}-03-31`,
    type: 'major',
    color: '#FFB6C1',
    emoji: '🐰',
    description: 'Spring celebration deals'
  },
  {
    name: "Easter",
    date: `${nextYear}-04-20`,
    type: 'major',
    color: '#FFB6C1',
    emoji: '🐰',
    description: 'Spring celebration deals'
  },

  // Earth Day
  {
    name: "Earth Day",
    date: `${currentYear}-04-22`,
    type: 'minor',
    color: '#228B22',
    emoji: '🌍',
    description: 'Eco-friendly sticker promotions'
  },
  {
    name: "Earth Day",
    date: `${nextYear}-04-22`,
    type: 'minor',
    color: '#228B22',
    emoji: '🌍',
    description: 'Eco-friendly sticker promotions'
  },

  // Mother's Day (second Sunday in May)
  {
    name: "Mother's Day",
    date: `${currentYear}-05-12`,
    type: 'commercial',
    color: '#FF69B4',
    emoji: '👩',
    description: 'Mom-themed sticker deals'
  },
  {
    name: "Mother's Day",
    date: `${nextYear}-05-11`,
    type: 'commercial',
    color: '#FF69B4',
    emoji: '👩',
    description: 'Mom-themed sticker deals'
  },

  // Memorial Day (last Monday in May)
  {
    name: "Memorial Day",
    date: `${currentYear}-05-27`,
    type: 'major',
    color: '#B22222',
    emoji: '🇺🇸',
    description: 'Patriotic sticker sales'
  },
  {
    name: "Memorial Day",
    date: `${nextYear}-05-26`,
    type: 'major',
    color: '#B22222',
    emoji: '🇺🇸',
    description: 'Patriotic sticker sales'
  },

  // Father's Day (third Sunday in June)
  {
    name: "Father's Day",
    date: `${currentYear}-06-16`,
    type: 'commercial',
    color: '#4169E1',
    emoji: '👨',
    description: 'Dad-themed sticker deals'
  },
  {
    name: "Father's Day",
    date: `${nextYear}-06-15`,
    type: 'commercial',
    color: '#4169E1',
    emoji: '👨',
    description: 'Dad-themed sticker deals'
  },

  // Independence Day
  {
    name: "Independence Day",
    date: `${currentYear}-07-04`,
    type: 'major',
    color: '#FF0000',
    emoji: '🎆',
    description: 'July 4th sticker specials'
  },
  {
    name: "Independence Day",
    date: `${nextYear}-07-04`,
    type: 'major',
    color: '#FF0000',
    emoji: '🎆',
    description: 'July 4th sticker specials'
  },

  // Back to School
  {
    name: "Back to School",
    date: `${currentYear}-08-15`,
    type: 'seasonal',
    color: '#FFA500',
    emoji: '🎒',
    description: 'Student sticker deals'
  },
  {
    name: "Back to School",
    date: `${nextYear}-08-15`,
    type: 'seasonal',
    color: '#FFA500',
    emoji: '🎒',
    description: 'Student sticker deals'
  },

  // Labor Day (first Monday in September)
  {
    name: "Labor Day",
    date: `${currentYear}-09-02`,
    type: 'major',
    color: '#8B4513',
    emoji: '🛠️',
    description: 'End of summer sales'
  },
  {
    name: "Labor Day",
    date: `${nextYear}-09-01`,
    type: 'major',
    color: '#8B4513',
    emoji: '🛠️',
    description: 'End of summer sales'
  },

  // Halloween
  {
    name: "Halloween",
    date: `${currentYear}-10-31`,
    type: 'commercial',
    color: '#FF8C00',
    emoji: '🎃',
    description: 'Spooky sticker deals'
  },
  {
    name: "Halloween",
    date: `${nextYear}-10-31`,
    type: 'commercial',
    color: '#FF8C00',
    emoji: '🎃',
    description: 'Spooky sticker deals'
  },

  // Thanksgiving (fourth Thursday in November)
  {
    name: "Thanksgiving",
    date: `${currentYear}-11-28`,
    type: 'major',
    color: '#D2691E',
    emoji: '🦃',
    description: 'Gratitude-themed deals'
  },
  {
    name: "Thanksgiving",
    date: `${nextYear}-11-27`,
    type: 'major',
    color: '#D2691E',
    emoji: '🦃',
    description: 'Gratitude-themed deals'
  },

  // Black Friday
  {
    name: "Black Friday",
    date: `${currentYear}-11-29`,
    type: 'commercial',
    color: '#000000',
    emoji: '🛍️',
    description: 'Biggest sale of the year'
  },
  {
    name: "Black Friday",
    date: `${nextYear}-11-28`,
    type: 'commercial',
    color: '#000000',
    emoji: '🛍️',
    description: 'Biggest sale of the year'
  },

  // Cyber Monday
  {
    name: "Cyber Monday",
    date: `${currentYear}-12-02`,
    type: 'commercial',
    color: '#0000FF',
    emoji: '💻',
    description: 'Online sticker deals'
  },
  {
    name: "Cyber Monday",
    date: `${nextYear}-12-01`,
    type: 'commercial',
    color: '#0000FF',
    emoji: '💻',
    description: 'Online sticker deals'
  },

  // Christmas
  {
    name: "Christmas",
    date: `${currentYear}-12-25`,
    type: 'major',
    color: '#DC143C',
    emoji: '🎄',
    description: 'Holiday sticker specials'
  },
  {
    name: "Christmas",
    date: `${nextYear}-12-25`,
    type: 'major',
    color: '#DC143C',
    emoji: '🎄',
    description: 'Holiday sticker specials'
  },

  // New Year's Eve
  {
    name: "New Year's Eve",
    date: `${currentYear}-12-31`,
    type: 'major',
    color: '#FFD700',
    emoji: '🥳',
    description: 'Year-end celebration deals'
  },
  {
    name: "New Year's Eve",
    date: `${nextYear}-12-31`,
    type: 'major',
    color: '#FFD700',
    emoji: '🥳',
    description: 'Year-end celebration deals'
  }
];

// Helper function to get holidays for a specific date
export const getHolidaysForDate = (date: string): Holiday[] => {
  return holidays.filter(holiday => holiday.date === date);
};

// Helper function to get holidays for a specific month
export const getHolidaysForMonth = (year: number, month: number): Holiday[] => {
  const monthStr = month.toString().padStart(2, '0');
  const prefix = `${year}-${monthStr}`;
  return holidays.filter(holiday => holiday.date.startsWith(prefix));
};

// Helper function to check if a date is a holiday
export const isHoliday = (date: string): boolean => {
  return holidays.some(holiday => holiday.date === date);
}; 