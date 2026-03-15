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

// Start Date Types - for flexibility filtering
export enum StartDateType {
  FIXED = 'fixed',                    // Concrete date specified
  FLEXIBLE = 'flexible',              // "nach Absprache", "by arrangement", etc.
  NEGOTIABLE = 'negotiable',          // Can be discussed/negotiated
}

// Hiring Process Types - Critical for your use case
export enum HiringProcessType {
  STANDARD = 'standard',              // Follows typical August intake with rigid process
  OFF_CYCLE_CAPABLE = 'off-cycle-capable', // Can hire outside standard August window (March etc)
  FLEXIBLE = 'flexible',              // Very flexible on timing and process
  NEGOTIABLE = 'negotiable',          // Open to discussion on process
}

// Direct Contact Capability - For reaching decision makers
export enum DirectContactMethod {
  WHATSAPP = 'whatsapp',              // WhatsApp contact possible
  PHONE = 'phone',                    // Direct phone contact
  EMAIL_SENIOR = 'email-senior',      // Direct email to decision maker (not HR portal)
  HR_PORTAL_ONLY = 'hr-portal-only',  // Only through standard HR portal
  MIXED = 'mixed',                    // Multiple direct contact methods available
}

// Company Flexibility Score - How negotiation-friendly
export enum FlexibilityScore {
  LOW = 'low',                        // Rigid tariffs, standard only
  MEDIUM = 'medium',                  // Some flexibility, typical company
  HIGH = 'high',                      // Very flexible, startup-like, willing to negotiate
  UNKNOWN = 'unknown',                // Unknown flexibility level
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
  source?: 'scraped' | 'company_website' | 'tariff_standard' | 'unknown'; // Track data source
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

// Hiring Process Details - Critical for off-cycle negotiations
export interface IHiringProcess {
  process_type: HiringProcessType;      // Standard, off-cycle, flexible, etc.
  direct_contact_methods?: DirectContactMethod[]; // How to reach them directly
  decision_speed?: 'slow' | 'medium' | 'fast'; // How fast they make decisions
  verkshuerzung_supported?: boolean;    // Do they support IHK shortening petitions?
  tariff_negotiable?: boolean;          // Willing to negotiate above tariff minimums
  min_salary_negotiable?: boolean;      // Base salary is negotiable
  off_cycle_intake_possible?: boolean;  // Can they hire outside Aug/Sept?
  hiring_contact_name?: string;         // Name of decision maker (if available)
  hiring_contact_method?: DirectContactMethod; // Best method to reach them
  notes?: string;                       // Additional hiring flexibility notes
}

export interface IJob extends Document {
  // Core Info
  job_title: string;
  company_name: string;
  locations: ILocation[]; // Changed to array: Companies often hire for multiple cities in one ad
  
  // Dates & Logistics
  start_date?: Date; // e.g., 2026-09-01
  start_date_type?: StartDateType; // fixed, flexible, or negotiable
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
  
  // Hiring & Negotiation Details (NEW - Critical for your strategy)
  hiring_process?: IHiringProcess;    // Process flexibility and direct contact info
  company_flexibility?: FlexibilityScore; // How negotiation-friendly (indexed for sorting)
  
  // Employment Options
  minijob_acceptance?: boolean; // Whether minijob (450€) is accepted as alternative
  minijob_acceptance_rate?: number; // Percentage 0-100 of positions that accept minijob
  
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