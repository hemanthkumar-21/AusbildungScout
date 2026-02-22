import { IJob, EducationLevel, GermanLevel, TariffType } from '@/types';
import mongoose, { Schema } from 'mongoose';


// --- Schema Definition ---
const JobSchema: Schema = new Schema({
  job_title: { type: String, required: true, index: true },
  company_name: { type: String, required: true, index: true },
  
  locations: [{
    city: { type: String, required: true },
    zip_code: String,
    address: String,
    state: String
  }],

  // Dates
  start_date: { type: Date, index: true }, // Index for "Starts in 2026" filter
  duration_months: { type: Number, default: 36 },
  application_deadline: { type: Date },
  available_positions: { type: Number },

  // Requirements
  german_level_requirement: { 
    type: String, 
    enum: Object.values(GermanLevel), 
    default: GermanLevel.B2,
    index: true 
  },
  english_level_requirement: { 
    type: String, 
    enum: Object.values(GermanLevel), 
    default: GermanLevel.NONE 
  },
  education_required: {
    type: String,
    enum: Object.values(EducationLevel),
    default: EducationLevel.REALSCHULE,
    index: true
  },
  tech_stack: [{ type: String, lowercase: true }], // Lowercase for case-insensitive search
  driving_license_required: { type: Boolean, default: false },

  // Financials
  salary: {
    firstYearSalary: Number,
    thirdYearSalary: Number,
    average: { type: Number, index: true }, // Index for "Salary > X" filter
    currency: { type: String, default: 'EUR' }
  },
  
  // Tariff/Union Information
  tariff_type: {
    type: String,
    enum: Object.values(TariffType),
    default: TariffType.NONE,
    index: true // Index for filtering by tariff type
  },
  
  // Critical International Filters
  visa_sponsorship: { type: Boolean, default: false, index: true },
  relocation_support: {
    offered: { type: Boolean, default: false, index: true },
    rent_subsidy: { type: Boolean, default: false },
    free_accommodation: { type: Boolean, default: false },
    moving_cost_covered: { type: Boolean, default: false },
    temporary_housing: { type: Boolean, default: false },
    relocation_bonus: Number,
    details: String
  },

  // Benefits
  benefits: [String], // Display text
  benefits_tags: [{ type: String, index: true }], // Machine readable tags for checkboxes
  benefits_verified: { type: Boolean, default: false }, // Whether benefits verified from official source
  benefits_last_updated: { type: Date }, // Last verification timestamp

  // Content
  description_full: { type: String }, 
  description_snippet: { type: String },
  original_link: { type: String, required: true, unique: true },
  source_platform: { type: String, default: 'ausbildung.de' },
  posted_at: { type: Date, default: Date.now },

  // Contact
  contact_person: {
    name: String,
    email: String,
    phone: String,
    role: String
  },

  // Verification & Staleness Tracking
  last_checked_at: { type: Date, default: null }, // Last time we verified job still exists
  is_active: { type: Boolean, default: true, index: true } // False if job no longer available
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Create a Text Index for search bar functionality (searches title, company, and stack)
JobSchema.index({ 
  job_title: 'text', 
  company_name: 'text', 
  tech_stack: 'text',
  description_full: 'text' 
});

export default mongoose.model<IJob>('Job', JobSchema);