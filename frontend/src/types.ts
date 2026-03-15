export const GermanLevel = {
  NONE: 'None',
  A1: 'A1',
  A2: 'A2',
  B1: 'B1',
  B2: 'B2',
  C1: 'C1',
  C2: 'C2',
  NATIVE: 'Native',
} as const;

export type GermanLevel = typeof GermanLevel[keyof typeof GermanLevel];

export const EducationLevel = {
  NONE: 'Keine',
  HAUPTSCHULE: 'Hauptschulabschluss',
  REALSCHULE: 'Realschulabschluss',
  ABITUR: 'Abitur',
  FACHABITUR: 'Fachabitur',
} as const;

export type EducationLevel = typeof EducationLevel[keyof typeof EducationLevel];

export const TariffType = {
  NONE: 'None',
  IG_METALL: 'IG Metall',
  VERDI: 'ver.di',
  IG_BCE: 'IG BCE',
  IG_BAU: 'IG BAU',
  NGG: 'NGG',
  TVOEDE: 'TVöD',
  TV_L: 'TV-L',
  IT_TARIFVERTRAG: 'IT Tarifvertrag',
  EINZELHANDEL: 'Einzelhandel',
  BANKING: 'Banking',
  OTHER: 'Other',
} as const;

export type TariffType = typeof TariffType[keyof typeof TariffType];

export const StartDateType = {
  FIXED: 'fixed',
  FLEXIBLE: 'flexible',
  NEGOTIABLE: 'negotiable',
} as const;

export type StartDateType = typeof StartDateType[keyof typeof StartDateType];

// NEW: Hiring Process Types
export const HiringProcessType = {
  STANDARD: 'standard',
  OFF_CYCLE_CAPABLE: 'off-cycle-capable',
  FLEXIBLE: 'flexible',
  NEGOTIABLE: 'negotiable',
} as const;

export type HiringProcessType = typeof HiringProcessType[keyof typeof HiringProcessType];

export const DirectContactMethod = {
  WHATSAPP: 'whatsapp',
  PHONE: 'phone',
  EMAIL_SENIOR: 'email-senior',
  HR_PORTAL_ONLY: 'hr-portal-only',
  MIXED: 'mixed',
} as const;

export type DirectContactMethod = typeof DirectContactMethod[keyof typeof DirectContactMethod];

export const FlexibilityScore = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  UNKNOWN: 'unknown',
} as const;

export type FlexibilityScore = typeof FlexibilityScore[keyof typeof FlexibilityScore];

export interface ILocation {
  city: string;
  zip_code?: string;
  address?: string;
  state?: string;
}

export interface ISalary {
  firstYearSalary?: number;
  thirdYearSalary?: number;
  average?: number;
  currency: string;
  source?: 'scraped' | 'description_parsed' | 'company_website' | 'tariff_standard' | 'unknown';
}

export interface IContact {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface IRelocationSupport {
  offered: boolean;
  rent_subsidy?: boolean;
  free_accommodation?: boolean;
  moving_cost_covered?: boolean;
  temporary_housing?: boolean;
  relocation_bonus?: number;
  details?: string;
}

// NEW: Hiring Process Interface
export interface IHiringProcess {
  process_type?: HiringProcessType;
  direct_contact_methods?: DirectContactMethod[];
  decision_speed?: 'slow' | 'medium' | 'fast';
  verkshuerzung_supported?: boolean;
  tariff_negotiable?: boolean;
  min_salary_negotiable?: boolean;
  off_cycle_intake_possible?: boolean;
  hiring_contact_name?: string;
  hiring_contact_method?: DirectContactMethod;
  notes?: string;
}

export interface IJob {
  _id: string;
  job_title: string;
  company_name: string;
  locations: ILocation[];
  start_date?: string;
  start_date_type?: StartDateType;
  duration_months?: number;
  application_deadline?: string;
  available_positions?: number;
  vacancy_count?: number;
  german_level_requirement?: GermanLevel;
  english_level_requirement?: GermanLevel;
  education_required?: EducationLevel;
  tech_stack?: string[];
  driving_license_required?: boolean;
  salary?: ISalary;
  tariff_type?: TariffType;
  visa_sponsorship?: boolean;
  relocation_support?: IRelocationSupport;
  hiring_process?: IHiringProcess;
  company_flexibility?: FlexibilityScore;
  benefits?: string[];
  benefits_tags?: string[];
  benefits_verified?: boolean;
  benefits_last_updated?: string;
  minijob_acceptance?: boolean;
  minijob_acceptance_rate?: number;
  description_full?: string;
  description_snippet?: string;
  original_link?: string;
  source_platform?: string;
  posted_at?: string;
  contact_person?: IContact;
  last_checked_at?: string | null;
  is_active: boolean;
}

export interface JobFilterQuery {
  germanLevel?: GermanLevel;
  visaNeed?: boolean;
  minSalary?: number;
  maxSalary?: number;
  salaryAboveAverage?: boolean;
  startDate?: string;
  startDateType?: string;
  educationLevel?: string;
  minDurationMonths?: number;
  maxDurationMonths?: number;
  search?: string;
  page?: number;
  limit?: number;
  // Filters
  tariffTypes?: string;
  relocationSupport?: boolean;
  rentSubsidy?: boolean;
  freeAccommodation?: boolean;
  benefitTags?: string;
  minVacancies?: number;
  minijobAccepted?: boolean;
  minMinijobAcceptanceRate?: number;
  hideInactive?: boolean;
  sortBy?: 'salary-high' | 'salary-low' | 'duration-short' | 'flexibility' | 'default';
  // NEW: Hiring Process Filters
  hiringProcessTypes?: string;
  directContactMethods?: string;
  offCycleIntakePossible?: boolean;
  verkshuerzungSupported?: boolean;
  tariffNegotiable?: boolean;
  minSalaryNegotiable?: boolean;
  decisionSpeedMinimum?: 'fast' | 'medium' | 'slow';
  companyFlexibilityMinimum?: FlexibilityScore;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface JobsResponse {
  success: boolean;
  data: IJob[];
  pagination: PaginationInfo;
}

export interface JobResponse {
  success: boolean;
  data: IJob;
}
