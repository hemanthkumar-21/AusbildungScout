/**
 * Data Normalizer (Phase C)
 * Cleans and standardizes AI output before saving to MongoDB
 */

// Benefit Mapping - Maps various benefit descriptions to standardized tags
const benefitMap: Record<string, string> = {
  // Vacation
  '30 tage urlaub': 'VACATION_30',
  '30 days': 'VACATION_30',
  '30 days off': 'VACATION_30',
  'urlaub': 'VACATION_25',
  'vacation': 'VACATION_25',
  
  // Salary & Financial
  '13th salary': 'SALARY_13TH',
  '13. gehalt': 'SALARY_13TH',
  'weihnachtsgeld': 'SALARY_13TH',
  'urlaubsgeld': 'VACATION_PAY',
  'bonus': 'SALARY_BONUS',
  'erfolgsbeteiligung': 'PERFORMANCE_BONUS',
  'prämie': 'SALARY_BONUS',
  'altersvorsorge': 'PENSION_PLAN',
  'betriebliche altersvorsorge': 'PENSION_PLAN',
  'vermögenswirksame': 'VL',
  'vwl': 'VL',
  
  // Food & Wellness
  'free food': 'FREE_FOOD',
  'kostenloses essen': 'FREE_FOOD',
  'free lunch': 'FREE_FOOD',
  'mittagessen': 'FREE_FOOD',
  'kantine': 'CANTEEN',
  'free coffee': 'FREE_COFFEE',
  'kaffee': 'FREE_COFFEE',
  'obst': 'FREE_SNACKS',
  'getränke': 'FREE_DRINKS',
  'gym': 'GYM',
  'fitness': 'GYM',
  'fitnessstudio': 'GYM',
  'gesundheitsförderung': 'HEALTH_PROMOTION',
  'health insurance': 'HEALTH_INSURANCE',
  'krankenkasse': 'HEALTH_INSURANCE',
  'massages': 'WELLNESS',
  'massage': 'WELLNESS',
  
  // Equipment & Tech
  'laptop': 'LAPTOP',
  'notebook': 'LAPTOP',
  'computer': 'LAPTOP',
  'tablet': 'TABLET',
  'smartphone': 'COMPANY_PHONE',
  'handy': 'COMPANY_PHONE',
  'equipment': 'TECH_EQUIPMENT',
  
  // Work Arrangement
  'home office': 'HOME_OFFICE',
  'remote': 'HOME_OFFICE',
  'homeoffice': 'HOME_OFFICE',
  'mobiles arbeiten': 'REMOTE_WORK',
  'flexible working': 'FLEXIBLE_HOURS',
  'flexible hours': 'FLEXIBLE_HOURS',
  'gleitzeit': 'FLEXIBLE_HOURS',
  'teilzeit': 'PART_TIME_OPTION',
  '4-tage-woche': 'FOUR_DAY_WEEK',
  
  // Travel & Mobility
  'bahn card': 'BAHN_CARD',
  'bahncard': 'BAHN_CARD',
  'public transport': 'PUBLIC_TRANSPORT',
  'jobticket': 'PUBLIC_TRANSPORT',
  'deutschlandticket': 'PUBLIC_TRANSPORT',
  'firmenwagen': 'COMPANY_CAR',
  'car': 'CAR_BENEFIT',
  'parking': 'PARKING',
  'parkplatz': 'PARKING',
  'fahrrad': 'BIKE_LEASE',
  'bike leasing': 'BIKE_LEASE',
  'jobrad': 'BIKE_LEASE',
  
  // Learning & Development
  'weiterbildung': 'TRAINING',
  'training': 'TRAINING',
  'fortbildung': 'TRAINING',
  'courses': 'TRAINING',
  'schulung': 'TRAINING',
  'education': 'TRAINING',
  'ausbildung': 'TRAINING',
  'english course': 'ENGLISH_COURSE',
  'sprachkurs': 'LANGUAGE_COURSE',
  'coaching': 'COACHING',
  'mentoring': 'MENTORING',
  'karriereentwicklung': 'CAREER_DEVELOPMENT',
  
  // Work Environment
  'team events': 'TEAM_EVENTS',
  'teamevents': 'TEAM_EVENTS',
  'betriebsfest': 'COMPANY_EVENTS',
  'firmenevents': 'COMPANY_EVENTS',
  'modern office': 'MODERN_OFFICE',
  'moderne büros': 'MODERN_OFFICE',
  'küche': 'KITCHEN',
  
  // Family & Life Balance
  'kindergarten': 'DAYCARE',
  'kita': 'DAYCARE',
  'kinderbetreuung': 'CHILDCARE',
  'elternzeit': 'PARENTAL_LEAVE',
  'sabbatical': 'SABBATICAL',
  
  // Mental Health & Wellbeing
  'mental health': 'MENTAL_HEALTH',
  'therapy': 'MENTAL_HEALTH',
  'psychologische beratung': 'MENTAL_HEALTH',
  'sports': 'SPORTS',
  'sport': 'SPORTS',
  
  // Other Benefits
  'mitarbeiterrabatte': 'EMPLOYEE_DISCOUNTS',
  'employee discounts': 'EMPLOYEE_DISCOUNTS',
  'corporate benefits': 'EMPLOYEE_DISCOUNTS',
  'hund': 'PET_FRIENDLY',
  'pet friendly': 'PET_FRIENDLY',
  'haustier': 'PET_FRIENDLY',
  'unbefristet': 'PERMANENT_CONTRACT',
  'permanent': 'PERMANENT_CONTRACT',
  'übernahmegarantie': 'JOB_GUARANTEE',
  'übernahme': 'TAKEOVER_OPTION',
};

export function normalizeBenefits(rawBenefits: string[]): string[] {
  const normalized = new Set<string>();
  
  rawBenefits.forEach(benefit => {
    const normalized_benefit = benefit.toLowerCase().trim();
    
    // Check for exact and fuzzy matches
    for (const [key, tag] of Object.entries(benefitMap)) {
      if (normalized_benefit.includes(key) || key.includes(normalized_benefit)) {
        normalized.add(tag);
        return;
      }
    }
  });
  
  return Array.from(normalized);
}

/**
 * Normalize tech stack:
 * - Convert to lowercase
 * - Remove duplicates
 * - Remove whitespace
 */
export function normalizeTechStack(stack: string[]): string[] {
  const normalized = new Set(
    stack
      .map(tech => tech.toLowerCase().trim())
      .filter(tech => tech.length > 0)
  );
  return Array.from(normalized).sort();
}

/**
 * Normalize salary average
 * If only Tarifvertrag mentioned, return null
 */
export function calculateSalaryAverage(
  salary_min?: number,
  salary_max?: number,
  tarifvertrag_only?: boolean
): number | null {
  if (tarifvertrag_only) {
    return null; // Don't guess
  }
  
  if (salary_min && salary_max) {
    return Math.round((salary_min + salary_max) / 2);
  }
  
  if (salary_min) {
    return salary_min;
  }
  
  if (salary_max) {
    return salary_max;
  }
  
  return null;
}

/**
 * Normalize dates to ISO format
 * Handles: "01.09.2026", "1. September 26", "Sep '26"
 */
export function normalizeDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  try {
    // Try parsing with moment-like formats
    const cleaned = dateStr.trim().toLowerCase();
    
    // Format: DD.MM.YYYY or D.M.YYYY
    const ddmmyyyy = cleaned.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
    
    // Format: "1. September 26" or "Sep '26"
    const monthNames: Record<string, number> = {
      'januar': 1, 'january': 1, 'jan': 1,
      'februar': 2, 'february': 2, 'feb': 2,
      'märz': 3, 'march': 3, 'mär': 3,
      'april': 4, 'apr': 4,
      'mai': 5, 'may': 5,
      'juni': 6, 'june': 6, 'jun': 6,
      'juli': 7, 'july': 7, 'jul': 7,
      'august': 8, 'aug': 8,
      'september': 9, 'sep': 9,
      'oktober': 10, 'october': 10, 'okt': 10,
      'november': 11, 'nov': 11,
      'dezember': 12, 'december': 12, 'dez': 12,
    };
    
    // Try "1. September 26"
    const dayMonthYear = cleaned.match(/(\d{1,2})\.\s*(\w+)\s*(\d{2,4})/);
    if (dayMonthYear) {
      const [, day, month, year] = dayMonthYear;
      const monthNum = monthNames[month];
      if (monthNum) {
        const fullYear = parseInt(year) < 100 ? 2000 + parseInt(year) : parseInt(year);
        return new Date(`${fullYear}-${String(monthNum).padStart(2, '0')}-${day.padStart(2, '0')}`);
      }
    }
    
    // Fallback: Try native parsing
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Remove duplicates from array
 */
export function removeDuplicates<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/**
 * Sanitize location text
 */
export function sanitizeLocation(location: string): string {
  return location
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/,\s*,/g, ',');
}
