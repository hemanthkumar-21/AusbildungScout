export enum GermanLevel {
  NONE = 'None',
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
  NATIVE = 'Native',
}

// Mapping for level comparison
export const GermanLevelRank = {
  [GermanLevel.NONE]: 0,
  [GermanLevel.A1]: 1,
  [GermanLevel.A2]: 2,
  [GermanLevel.B1]: 3,
  [GermanLevel.B2]: 4,
  [GermanLevel.C1]: 5,
  [GermanLevel.C2]: 6,
  [GermanLevel.NATIVE]: 7,
};

export enum EducationLevel {
  NONE = 'Keine',
  HAUPTSCHULE = 'Hauptschulabschluss', // ~9th grade
  REALSCHULE = 'Realschulabschluss',   // ~10th grade (Intermediate)
  ABITUR = 'Abitur',                   // ~12/13th grade (High School Diploma)
  FACHABITUR = 'Fachabitur',           // Vocational Diploma
}

// Collective Bargaining Agreement (Tarifvertrag) Types
export enum TariffType {
  NONE = 'None',
  IG_METALL = 'IG Metall',           // Metal and electrical engineering union
  VERDI = 'ver.di',                  // United services union
  IG_BCE = 'IG BCE',                 // Mining, chemical, energy union
  IG_BAU = 'IG BAU',                 // Construction union
  NGG = 'NGG',                       // Food, beverage, hospitality union
  TVÖD = 'TVöD',                     // Public sector
  TV_L = 'TV-L',                     // State public sector
  IT_TARIFVERTRAG = 'IT Tarifvertrag', // IT collective agreement
  EINZELHANDEL = 'Einzelhandel',     // Retail
  BANKING = 'Banking',               // Banking sector
  OTHER = 'Other',                   // Other tariff agreements
}

// --- Interfaces ---
export interface ILocation {
  city: string;
  zip_code?: string;
  address?: string;
  state?: string; // e.g., Bavaria
}

export interface ISalary {
  firstYearSalary?: number;
  thirdYearSalary?: number;
  average?: number; // Calculated field for easier filtering (e.g., > €1000)
  currency: string;
}

export interface IContact {
  name?: string;
  email?: string;
  phone?: string;
  role?: string; // e.g., "Recruiter"
}

// Enhanced Relocation Support Details
export interface IRelocationSupport {
  offered: boolean;                    // Whether any relocation support exists
  rent_subsidy?: boolean;               // Rent subsidy provided
  free_accommodation?: boolean;         // Free stay/housing provided
  moving_cost_covered?: boolean;        // Moving costs reimbursed
  temporary_housing?: boolean;          // Temporary housing during transition
  relocation_bonus?: number;            // One-time relocation bonus (in EUR)
  details?: string;                     // Additional details
}

export interface IJob extends Document {
  // Core Info
  job_title: string;
  company_name: string;
  locations: ILocation[]; // Changed to array: Companies often hire for multiple cities in one ad
  
  // Dates & Logistics
  start_date?: Date; // e.g., 2026-09-01
  duration_months?: number; // e.g., 36
  application_deadline?: Date;
  available_positions?: number; // e.g., 2
  vacancy_count?: number; // Number of open positions (from listing page)
  
  // Requirements
  german_level_requirement?: GermanLevel;
  english_level_requirement?: GermanLevel;
  education_required?: EducationLevel;
  tech_stack?: string[]; // e.g., ["Java", "C#", "SAP"]
  driving_license_required?: boolean;
  
  // Financials
  salary?: ISalary;
  tariff_type?: TariffType; // Collective bargaining agreement type
  visa_sponsorship?: boolean; // Vital for international applicants
  relocation_support?: IRelocationSupport; // Detailed relocation information
  
  // Benefits (Structured for Filters)
  benefits?: string[]; // Raw text list e.g. "Free Gym"
  benefits_tags?: string[]; // Standardized tags: ["30_DAYS_VACATION", "LAPTOP", "CANTEEN", "13TH_SALARY"]
  benefits_verified?: boolean; // Whether benefits were verified from official company source
  benefits_last_updated?: Date; // Last time benefits were updated from official source
  
  // Meta
  description_full?: string; // The full raw text for search
  description_snippet?: string; // Short summary for the card
  original_link?: string;
  source_platform?: string;
  posted_at?: Date;
  
  // Contact Info (For Cover Letters)
  contact_person?: IContact;

  // Verification & Staleness Tracking
  last_checked_at?: Date | null; // Last time we verified job still exists
  is_active: boolean; // False if job no longer available
}