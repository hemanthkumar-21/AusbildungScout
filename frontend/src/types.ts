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
}

export interface IContact {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface IJob {
  _id: string;
  job_title: string;
  company_name: string;
  locations: ILocation[];
  start_date?: string;
  duration_months?: number;
  application_deadline?: string;
  available_positions?: number;
  german_level_requirement?: GermanLevel;
  english_level_requirement?: GermanLevel;
  education_required?: EducationLevel;
  tech_stack?: string[];
  driving_license_required?: boolean;
  salary?: ISalary;
  visa_sponsorship?: boolean;
  relocation_support?: boolean;
  benefits?: string[];
  benefits_tags?: string[];
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
  startDate?: string;
  educationLevel?: string;
  search?: string;
  page?: number;
  limit?: number;
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
