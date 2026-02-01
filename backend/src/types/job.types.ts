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
  
  // Requirements
  german_level_requirement?: GermanLevel;
  english_level_requirement?: GermanLevel;
  education_required?: EducationLevel;
  tech_stack?: string[]; // e.g., ["Java", "C#", "SAP"]
  driving_license_required?: boolean;
  
  // Financials
  salary?: ISalary;
  visa_sponsorship?: boolean; // Vital for international applicants
  relocation_support?: boolean; // e.g., "Help with apartment"
  
  // Benefits (Structured for Filters)
  benefits?: string[]; // Raw text list e.g. "Free Gym"
  benefits_tags?: string[]; // Standardized tags: ["30_DAYS_VACATION", "LAPTOP", "CANTEEN", "13TH_SALARY"]
  
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