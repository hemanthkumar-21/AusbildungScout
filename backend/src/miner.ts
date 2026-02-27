/**
 * Miner (Background Worker)
 * Runs offline to scrape, analyze, and save jobs to the database
 * This is NOT part of the express server - it runs separately
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import connectDB from '@/db';
import Job from '@/model/job';
import JobScraper from '@/utils/scraper';
import { createJobAnalysisPrompt, processAIResponse } from '@/utils/gemini-pipeline';
import { resolveFirstYearSalary } from '@/utils/salary-resolver';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

interface MinerConfig {
  urls: string[];
  maxJobsPerRun: number;
  dryRun: boolean;
  enrichSalary?: boolean; // Whether to check company websites for missing salaries
}

class JobMiner {
  private scraper: JobScraper;
  private config: MinerConfig;
  private rawDataDir: string;
  private geminiApiKeys: string[] = [];
  private currentKeyIndex: number = 0;
  private keyStats: Map<number, { lastCallTime: number; callCount: number; resetTime: number }> = new Map();
  
  constructor(config: MinerConfig) {
    this.config = config;
    
    // Load multiple API keys from environment (comma-separated)
    const apiKeysEnv = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
    this.geminiApiKeys = apiKeysEnv.split(',').map(key => key.trim()).filter(key => key.length > 0);
    
    if (this.geminiApiKeys.length === 0) {
      console.warn('⚠️  No Gemini API keys found. Set GEMINI_API_KEYS or GEMINI_API_KEY in .env');
    } else {
      console.log(`🔑 Loaded ${this.geminiApiKeys.length} Gemini API key(s) for rotation`);
      // Initialize stats for each key
      for (let i = 0; i < this.geminiApiKeys.length; i++) {
        this.keyStats.set(i, { lastCallTime: 0, callCount: 0, resetTime: Date.now() });
      }
    }
    this.scraper = new JobScraper({
      minDelayMs: parseInt(process.env.SCRAPER_MIN_DELAY_MS || '2000'),
      maxDelayMs: parseInt(process.env.SCRAPER_MAX_DELAY_MS || '5000'),
    });
    
    // Create directory for raw HTML files
    this.rawDataDir = path.join(process.cwd(), 'raw_data');
    if (!fs.existsSync(this.rawDataDir)) {
      fs.mkdirSync(this.rawDataDir, { recursive: true });
    }
  }
  
  /**
   * Save raw HTML content to file
   */
  private saveRawHTML(html: string, jobUrl: string, index: number): string {
    try {
      // Create filename from URL (safe characters only)
      const urlHash = Buffer.from(jobUrl).toString('base64').replace(/[^a-z0-9]/gi, '').substring(0, 20);
      const filename = `${index}_${urlHash}.html`;
      const filepath = path.join(this.rawDataDir, filename);
      
      // Save raw HTML with metadata header
      const content = `<!-- Raw HTML Scraped from: ${jobUrl} -->
<!-- Scraped at: ${new Date().toISOString()} -->
<meta charset="UTF-8">
<!-- ============= RAW HTML CONTENT START ============= -->

${html}

<!-- ============= RAW HTML CONTENT END ============= -->`;
      
      fs.writeFileSync(filepath, content, 'utf-8');
      console.log(`💾 Raw HTML saved: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error(`⚠️  Failed to save raw HTML: ${error}`);
      return '';
    }
  }
  
  /**
   * Get current API key and rotate to next if needed
   */
  private getCurrentApiKey(): string | null {
    if (this.geminiApiKeys.length === 0) return null;
    return this.geminiApiKeys[this.currentKeyIndex] || null;
  }
  
  /**
   * Rotate to next API key
   */
  private rotateToNextKey(): void {
    const oldIndex = this.currentKeyIndex;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.geminiApiKeys.length;
    console.log(`🔄 Rotating API key: ${oldIndex + 1} → ${this.currentKeyIndex + 1}`);
  }
  
  /**
   * Check if current key can make a request (not rate limited)
   */
  private canUseCurrentKey(): boolean {
    const stats = this.keyStats.get(this.currentKeyIndex);
    if (!stats) return true;
    
    // Reset counter every minute
    const timeSinceReset = Date.now() - stats.resetTime;
    if (timeSinceReset > 60000) {
      stats.callCount = 0;
      stats.resetTime = Date.now();
      return true;
    }
    
    // Check if approaching rate limit (14 out of 15 calls per minute)
    return stats.callCount < 14;
  }
  
  /**
   * Find next available API key that's not rate limited
   */
  private findAvailableKey(): boolean {
    const startIndex = this.currentKeyIndex;
    
    // Try all keys in rotation
    for (let i = 0; i < this.geminiApiKeys.length; i++) {
      if (this.canUseCurrentKey()) {
        return true;
      }
      this.rotateToNextKey();
      
      // If we've cycled back to start, all keys are rate limited
      if (this.currentKeyIndex === startIndex && i > 0) {
        return false;
      }
    }
    
    return false;
  }
  
  /**
   * Record API call for current key
   */
  private recordApiCall(): void {
    const stats = this.keyStats.get(this.currentKeyIndex);
    if (stats) {
      stats.lastCallTime = Date.now();
      stats.callCount++;
    }
  }
  
  /**
   * Wait for minimum delay between API calls
   */
  private async waitForRateLimit(): Promise<void> {
    const stats = this.keyStats.get(this.currentKeyIndex);
    if (!stats) return;
    
    const minDelayMs = 4000; // 4 seconds between calls
    const timeSinceLastCall = Date.now() - stats.lastCallTime;
    
    if (timeSinceLastCall < minDelayMs) {
      const delayNeeded = minDelayMs - timeSinceLastCall;
      console.log(`⏳ Rate limiting (Key ${this.currentKeyIndex + 1}): waiting ${delayNeeded}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }
  }

  /**
   * Delete raw HTML file and associated debug files
   */
  private deleteRawFiles(rawFilePath: string): void {
    try {
      // Delete raw HTML file
      if (rawFilePath && fs.existsSync(rawFilePath)) {
        fs.unlinkSync(rawFilePath);
        console.log(`🗑️  Deleted raw file: ${path.basename(rawFilePath)}`);
      }
      
      // Delete corresponding page_debug files if they exist
      const debugDir = path.join(process.cwd(), 'page_debug');
      if (fs.existsSync(debugDir)) {
        const filename = path.basename(rawFilePath);
        const debugFiles = fs.readdirSync(debugDir).filter(file => file.includes(filename.replace('.html', '')));
        for (const debugFile of debugFiles) {
          const debugPath = path.join(debugDir, debugFile);
          fs.unlinkSync(debugPath);
          console.log(`🗑️  Deleted debug file: ${debugFile}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Failed to delete raw files: ${error}`);
    }
  }

  /**
   * Check if a job needs salary enrichment
   */
  private async shouldEnrichSalary(jobData: any): Promise<boolean> {
    // Check if job doesn't have firstYearSalary but has a tariff
    const hasNoSalary = !jobData.salary?.firstYearSalary;
    const hasTariff = jobData.tariff_type && jobData.tariff_type !== 'None';
    
    return hasNoSalary && hasTariff;
  }
  
  /**
   * Enrich job salary by checking company website
   */
  private async enrichJobSalary(jobData: any): Promise<void> {
    try {
      console.log(`💰 Enriching salary for ${jobData.company_name}...`);
      
      const salaryResolution = await resolveFirstYearSalary(
        jobData.salary?.firstYearSalary,
        jobData.salary?.thirdYearSalary,
        jobData.tariff_type,
        jobData.company_name,
        jobData.original_link
      );
      
      if (salaryResolution.firstYearSalary) {
        // Update the job data with enriched salary
        if (!jobData.salary) {
          jobData.salary = { currency: 'EUR' };
        }
        
        jobData.salary.firstYearSalary = salaryResolution.firstYearSalary;
        
        if (salaryResolution.thirdYearSalary) {
          jobData.salary.thirdYearSalary = salaryResolution.thirdYearSalary;
        }
        
        if (salaryResolution.average) {
          jobData.salary.average = salaryResolution.average;
        }
        
        jobData.benefits_last_updated = new Date();
        
        console.log(`✓ Enriched salary: €${salaryResolution.firstYearSalary}/month (source: ${salaryResolution.source})`);
      } else {
        console.log(`\u2139\ufe0f No salary found from ${salaryResolution.source}`);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.warn(`\u26a0\ufe0f Salary enrichment failed: ${error}`)
      // Continue anyway - job will still be saved with tariff standard salary
    }
  }

  /**
   * Main mining process with new architecture:
   * 1. Scrape ALL jobs from listing page (basic info only)
   * 2. For each job: check DB, update if exists, or scrape+save if new
   * 3. Mark jobs not in listing as inactive (don't delete)
   */
  async mine(): Promise<void> {
    try {
      console.log('🔍 Starting Job Miner...');
      console.log(`🎯 Max jobs per run: ${this.config.maxJobsPerRun}`);
      
      // Connect to database
      await connectDB();
      console.log('✓ Database connected');
      
      // === PHASE 1: Scrape ALL jobs from listing page ===
      console.log('\n📋 PHASE 1: Scraping all available jobs from listing page...');
      const allListedJobs = await this.scraper.getAllJobsFromListing();
      
      if (allListedJobs.length === 0) {
        console.log('⚠️ No jobs found on listing page. Exiting.');
        return;
      }
      
      console.log(`📊 Found ${allListedJobs.length} jobs on listing page`);
      
      // Create a map for quick lookup
      const listedJobUrls = new Set(allListedJobs.map(j => j.url));
      
      // === PHASE 2: Process each listed job ===
      console.log('\n📋 PHASE 2: Processing jobs (update existing or add new)...');
      
      let processed = 0;
      let updated = 0;
      let added = 0;
      let skipped = 0;
      
      for (const listedJob of allListedJobs) {
        if (processed >= this.config.maxJobsPerRun) {
          console.log(`⏹️ Reached max jobs limit (${this.config.maxJobsPerRun})`);
          break;
        }
        
        try {
          // Check if job exists in DB
          const existingJob = await Job.findOne({ original_link: listedJob.url });
          
          if (existingJob) {
            // Job exists - just update vacancy count if changed
            const currentVacancy = existingJob.vacancy_count || 1;
            const newVacancy = listedJob.vacancyCount || 1;
            
            if (currentVacancy !== newVacancy) {
              console.log(`✏️ Updating: ${listedJob.title} (${currentVacancy} → ${newVacancy} positions)`);
              if (!this.config.dryRun) {
                await Job.findByIdAndUpdate(existingJob._id, {
                  vacancy_count: newVacancy,
                  is_active: true,
                  last_checked_at: new Date(),
                });
              }
              updated++;
            } else {
              // Just update timestamp to mark as checked
              if (!this.config.dryRun) {
                await Job.findByIdAndUpdate(existingJob._id, {
                  is_active: true,
                  last_checked_at: new Date(),
                });
              }
              skipped++;
            }
          } else {
            // New job - do full scraping and analysis
            console.log(`➕ New job found: ${listedJob.title} at ${listedJob.company}`);
            
            // Scrape full job page
            const html = await this.scraper.scrapeJobPage(listedJob.url);
            if (!html) {
              console.log(`⚠️ Failed to scrape: ${listedJob.url}`);
              continue;
            }
            
            // Save raw HTML
            const rawFilePath = this.saveRawHTML(html, listedJob.url, processed + 1);
            
            // Clean and analyze with AI
            const cleanedHtml = this.scraper.cleanHTML(html);
            const aiJobData = await this.analyzeWithGemini(cleanedHtml, listedJob.url);
            
            if (!aiJobData) {
              console.log(`⚠️ AI analysis failed for: ${listedJob.url}`);
              this.deleteRawFiles(rawFilePath);
              continue;
            }
            
            // Add vacancy count from listing page
            aiJobData.vacancy_count = listedJob.vacancyCount || 1;
            
            // Enrich salary if needed
            if (this.config.enrichSalary && await this.shouldEnrichSalary(aiJobData)) {
              await this.enrichJobSalary(aiJobData);
            }
            
            // Save to database
            if (!this.config.dryRun) {
              try {
                const job = new Job(aiJobData);
                await job.save();
                console.log(`✓ Added: ${aiJobData.job_title} at ${aiJobData.company_name}`);
                this.deleteRawFiles(rawFilePath);
                added++;
              } catch (error) {
                console.error(`✗ Failed to save job: ${error}`);
              }
            } else {
              console.log(`[DRY RUN] Would add: ${aiJobData.job_title}`);
              this.deleteRawFiles(rawFilePath);
              added++;
            }
          }
          
          processed++;
          
          // Progress update every 10 jobs
          if (processed % 10 === 0) {
            console.log(`📊 Progress: ${processed}/${Math.min(allListedJobs.length, this.config.maxJobsPerRun)} jobs processed`);
          }
          
        } catch (error) {
          console.error(`⚠️ Error processing job ${listedJob.url}:`, error);
        }
      }
      
      // === PHASE 3: Mark unlisted jobs as inactive ===
      console.log('\n📋 PHASE 3: Checking for jobs no longer listed...');
      await this.markUnlistedJobsAsInactive(listedJobUrls);
      
      // Summary
      console.log(`\n🎉 Mining complete!`);
      console.log(`   📊 Total processed: ${processed}`);
      console.log(`   ➕ New jobs added: ${added}`);
      console.log(`   ✏️  Jobs updated: ${updated}`);
      console.log(`   ⏭️  Jobs unchanged: ${skipped}`);
      
    } catch (error) {
      console.error('❌ Mining failed:', error);
      process.exit(1);
    } finally {
      await this.scraper.close();
      process.exit(0);
    }
  }

  /**
   * Mark jobs not in the listing as inactive (preserve historical data)
   */
  private async markUnlistedJobsAsInactive(listedJobUrls: Set<string>): Promise<void> {
    try {
      // Find all active jobs in DB
      const allDbJobs = await Job.find({ is_active: true }).select('_id original_link job_title company_name');
      
      let markedInactive = 0;
      
      for (const dbJob of allDbJobs) {
        // Skip if no original_link
        if (!dbJob.original_link) {
          console.log(`⚠️ Skipping job without original_link: ${dbJob.job_title}`);
          continue;
        }
        
        if (!listedJobUrls.has(dbJob.original_link)) {
          // Job not in listing anymore - mark as inactive
          console.log(`⚠️ No longer listed: ${dbJob.job_title} at ${dbJob.company_name}`);
          
          if (!this.config.dryRun) {
            await Job.findByIdAndUpdate(dbJob._id, {
              is_active: false,
              last_checked_at: new Date(),
            });
          }
          markedInactive++;
        }
      }
      
      console.log(`✓ Marked ${markedInactive} jobs as inactive (not deleted - preserved for history)`);
      
    } catch (error) {
      console.error('⚠️ Error marking inactive jobs:', error);
    }
  }

  /**
   * Check if a job page indicates that vacancies are still available
   */
  private hasVacancies(html: string): boolean {
    const lowerHtml = html.toLowerCase();
    
    // Indicators that job is closed/no vacancies
    const closedIndicators = [
      'keine freien plätze',
      'keine plätze verfügbar',
      'ausbildungsplatz besetzt',
      'stelle besetzt',
      'bewerbungsfrist abgelaufen',
      'nicht mehr verfügbar',
      'no longer available',
      'position filled',
      'bewerbungen nicht mehr möglich',
      'bewerbung geschlossen',
      'ausbildung abgeschlossen',
      'bereits vergeben',
      'nicht mehr zugänglich',
      '404',
      'page not found',
      'seite nicht gefunden'
    ];
    
    // Check if any closed indicators are present
    for (const indicator of closedIndicators) {
      if (lowerHtml.includes(indicator)) {
        return false;
      }
    }
    
    // Check for available positions count
    const positionsMatch = html.match(/verfügbare\s+plätze[:\s]+(\d+)/i) || 
                          html.match(/freie\s+plätze[:\s]+(\d+)/i) ||
                          html.match(/available\s+positions[:\s]+(\d+)/i);
    
    if (positionsMatch && positionsMatch[1]) {
      const count = parseInt(positionsMatch[1], 10);
      return count > 0;
    }
    
    // If no clear indicators, assume still available
    return true;
  }

  /**
   * Helper to get nested values from objects
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Compare job data to detect changes
   */
  private hasJobChanges(existingJob: any, newJobData: any): boolean {
    // Compare key fields that would indicate a significant change
    const fieldsToCompare = [
      'job_title',
      'company_name',
      'salary.firstYearSalary',
      'salary.thirdYearSalary',
      'application_deadline',
      'available_positions',
      'german_level_requirement',
      'english_level_requirement',
      'tech_stack',
      'benefits_tags'
    ];
    
    for (const field of fieldsToCompare) {
      const existingValue = this.getNestedValue(existingJob, field);
      const newValue = this.getNestedValue(newJobData, field);
      
      // For arrays, compare as strings to detect changes
      if (Array.isArray(existingValue) && Array.isArray(newValue)) {
        if (JSON.stringify(existingValue.sort()) !== JSON.stringify(newValue.sort())) {
          return true;
        }
      } else if (existingValue !== newValue) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Parse job data directly from HTML using basic selectors
   * Fallback when Gemini API is unavailable
   */
  private parseJobFromHTML(html: string, jobUrl: string): Partial<any> | null {
    try {
      // Extract job title - look for heading tags
      const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const jobTitle = titleMatch?.[1]?.trim() || 'IT Specialist';
      
      // Extract company name - look for company patterns
      const companyMatch = html.match(/<span[^>]*class="[^"]*company[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                          html.match(/<div[^>]*class="[^"]*company[^"]*"[^>]*>([^<]+)<\/div>/i);
      const companyName = companyMatch?.[1]?.trim() || 'Unknown Company';
      
      // Extract location - look for location patterns
      const locationMatch = html.match(/<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                           html.match(/(?:Ort|Location|Stadt).*?<[^>]*>([^<]+)<\/[^>]*>/i);
      const city = locationMatch?.[1]?.trim() || 'Germany';
      
      // Basic job data
      const jobData = {
        job_title: jobTitle,
        company_name: companyName,
        locations: [{ city, state: 'Germany' }],
        source_platform: 'ausbildung.de',
        original_link: jobUrl,
      };
      
      return jobData;
    } catch (error) {
      console.error('❌ HTML parsing error:', error);
      return null;
    }
  }

  /**
   * Process job data from API (ausbildung.de) instead of scraping individual pages
   * This is more efficient as we get structured data directly
   */
  private async processAPIJobData(vacancyData: any, jobUrl: string): Promise<any> {
    try {
      // Create a structured job object from the API response
      const apiJobData = {
        job_title: vacancyData.title || 'Unknown Position',
        company_name: vacancyData.corporationName || 'Unknown Company',
        subsidiary_name: vacancyData.subsidiaryName,
        locations: [{
          city: vacancyData.location?.split(',')[0]?.trim() || 'Germany',
          state: 'Germany',
          address: vacancyData.location,
        }],
        source_platform: 'ausbildung.de',
        original_link: jobUrl,
        vacancy_count: vacancyData.vacancyCount,
        starts_no_earlier_than: vacancyData.startsNoEarlierThan,
        expected_graduation: vacancyData.expectedGraduation,
        apprenticeship_type: vacancyData.apprenticeshipType,
        duration: vacancyData.duration,
        application_options: vacancyData.applicationOptions,
        direct_application_on: vacancyData.directApplicationOn,
        salesforce_category: vacancyData.salesforceCategory,
        posted_at: new Date(),
      };
      
      return apiJobData;
    } catch (error) {
      console.error('❌ Error processing API job data:', error);
      return null;
    }
  }

  /**
   * Mine jobs from ausbildung.de API directly (more efficient than scraping individual pages)
   */
  private async mineFromAusbildungDeAPI(): Promise<void> {
    try {
      console.log('\n🔄 Mining from ausbildung.de API directly...');
      
      const baseUrl = 'https://www.ausbildung.de';
      const searchQuery = 'Anwendungsentwicklung|';
      let from = 0;
      const pageSize = 20;
      let totalProcessed = 0;
      
      // Fetch multiple pages from the API
      while (totalProcessed < this.config.maxJobsPerRun) {
        try {
          const response = await fetch(`${baseUrl}/suche/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain;charset=UTF-8',
              'Accept': 'text/x-component',
              'Cache-Control': 'no-cache',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            body: JSON.stringify([{ search: searchQuery, from }]),
          });
          
          if (!response.ok) {
            console.log('❌ API request failed, falling back to URL scraping');
            break;
          }
          
          const responseText = await response.text();
          
          // Parse the RSC response to extract job data
          let jsonString = responseText.trim();
          if (jsonString.includes('data')) {
            try {
              // Try to extract JSON from the RSC response
              const jsonMatch = jsonString.match(/"hits":\{"primary":\[([\s\S]*?)\],"extended":\[\]/);
              if (jsonMatch) {
                const hitsStr = '[' + jsonMatch[1] + ']';
                const hits = JSON.parse(hitsStr);
                
                console.log(`📦 Got ${hits.length} API results at position ${from}`);
                
                for (const job of hits) {
                  if (totalProcessed >= this.config.maxJobsPerRun) {
                    break;
                  }
                  
                  const vacancyData = job.vacancyData;
                  if (!vacancyData?.slug) continue;
                  
                  const jobUrl = `${baseUrl}/stellen/${vacancyData.slug}/`;
                  
                  // Check for duplicates
                  const isDuplicate = await Job.findOne({ original_link: jobUrl });
                  if (isDuplicate) {
                    console.log(`⏭️  Skipping duplicate: ${vacancyData.title}`);
                    continue;
                  }
                  
                  // Process API data
                  const apiJobData = await this.processAPIJobData(vacancyData, jobUrl);
                  if (!apiJobData) continue;
                  
                  // Save to database
                  if (!this.config.dryRun) {
                    try {
                      const job = new Job(apiJobData);
                      await job.save();
                      console.log(`✓ Saved (API): ${apiJobData.job_title} at ${apiJobData.company_name}`);
                      totalProcessed++;
                    } catch (error) {
                      console.error(`✗ Failed to save job: ${error}`);
                    }
                  } else {
                    console.log(`[DRY RUN] Would save: ${apiJobData.job_title}`);
                    totalProcessed++;
                  }
                }
                
                if (hits.length === 0) break;
                from += pageSize;
                
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            } catch (parseError) {
              console.log('Could not parse API response as JSON');
              break;
            }
          }
        } catch (error) {
          console.error('Error fetching from API:', error);
          break;
        }
      }
      
      console.log(`\n✓ API mining complete: ${totalProcessed} jobs processed`);
    } catch (error) {
      console.error('❌ API mining failed:', error);
    }
  }
  
  /**
   * Call Gemini API to analyze job HTML with rate limiting
   */
  private async analyzeWithGemini(html: string, jobUrl: string, retryCount: number = 0): Promise<any> {
    try {
      // Check if we have API keys
      if (this.geminiApiKeys.length === 0) {
        console.log('📌 Using HTML parser fallback (no API keys)...');
        return this.parseJobFromHTML(html, jobUrl);
      }
      
      // Find available API key (rotate if current is rate limited)
      if (!this.findAvailableKey()) {
        // All keys are rate limited, wait for the current key's window to reset
        const stats = this.keyStats.get(this.currentKeyIndex);
        if (stats) {
          const waitTime = 60000 - (Date.now() - stats.resetTime) + 1000;
          console.log(`⚠️  All API keys rate limited. Waiting ${Math.ceil(waitTime / 1000)}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          stats.callCount = 0;
          stats.resetTime = Date.now();
        }
      }
      
      // Wait for rate limit before making call
      await this.waitForRateLimit();
      
      const geminiApiKey = this.getCurrentApiKey();
      if (!geminiApiKey) {
        console.log('📌 Using HTML parser fallback (no valid API key)...');
        return this.parseJobFromHTML(html, jobUrl);
      }
      
      console.log(`🤖 Analyzing with Gemini API (Key ${this.currentKeyIndex + 1}/${this.geminiApiKeys.length})...`);
      
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const prompt = createJobAnalysisPrompt(html);
      
      // Record the API call
      this.recordApiCall();
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      console.log('✓ Gemini API response received', response);
      
      // Extract text from response
      const responseText = response.text;
      
      if (!responseText) {
        throw new Error('No text content in Gemini response');
      }
      
      // Parse JSON response from Gemini
      // Handle cases where response might be wrapped in markdown code blocks
      let jsonString = responseText.trim();
      
      // Remove markdown code block if present
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      const aiResponse = JSON.parse(jsonString.trim());
      const normalized = await processAIResponse(aiResponse, jobUrl);
      
      return normalized;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle 429 Too Many Requests by rotating to next key
      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('Too Many Requests')) {
        console.warn(`⚠️  API Key ${this.currentKeyIndex + 1} rate limited`);
        
        // Mark current key as rate limited and rotate
        const stats = this.keyStats.get(this.currentKeyIndex);
        if (stats) {
          stats.callCount = 15; // Mark as maxed out
        }
        
        // Try next key if available
        if (this.geminiApiKeys.length > 1 && retryCount < this.geminiApiKeys.length) {
          this.rotateToNextKey();
          console.log(`🔄 Retrying with next API key (attempt ${retryCount + 1}/${this.geminiApiKeys.length})...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
          return this.analyzeWithGemini(html, jobUrl, retryCount + 1);
        } else if (retryCount < this.geminiApiKeys.length + 2) {
          // All keys tried, wait and retry with first key
          const backoffMs = 30000; // 30 seconds
          console.warn(`⚠️  All keys exhausted. Waiting ${backoffMs / 1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          this.currentKeyIndex = 0; // Reset to first key
          return this.analyzeWithGemini(html, jobUrl, retryCount + 1);
        } else {
          console.error('❌ Max retries exceeded for all Gemini API keys. Using fallback...');
          return this.parseJobFromHTML(html, jobUrl);
        }
      }
      
      console.error('❌ Gemini analysis error, using fallback...');
      console.error('Error details:', errorMessage);
      return this.parseJobFromHTML(html, jobUrl);
    }
  }
}

/**
 * Run the miner
 * Usage: 
 *   tsx src/miner.ts                    # Full mining with tariff salaries + company website enrichment
 *   tsx src/miner.ts --no-enrich-salary # Skip company website salary enrichment (faster)
 *   tsx src/miner.ts --dry-run          # Test without saving to DB
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const skipEnrichment = args.includes('--no-enrich-salary');
  const enrichSalary = !skipEnrichment; // Enabled by default
  const dryRun = args.includes('--dry-run') || process.env.DEMO_MODE === 'true';
  
  if (enrichSalary) {
    console.log('💰 Salary enrichment enabled - will check company websites for salary data');
  } else {
    console.log('⚡ Fast mode - using tariff standards only (no company website checks)');
  }
  
  const config: MinerConfig = {
    urls: [
      'https://www.ausbildung.de/suche/?search=Anwendungsentwicklung%7C&apprenticeshipType=Ausbildung',
    ],
    maxJobsPerRun: 100,
    dryRun,
    enrichSalary,
  };
  
  const miner = new JobMiner(config);
  try {
    await miner.mine();
  } finally {
    // Cleanup
    await miner['scraper'].close();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('miner.ts')) {
  main().catch(console.error);
}

export default JobMiner;
