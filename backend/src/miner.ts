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
import { GoogleGenAI } from '@google/genai';

dotenv.config();

interface MinerConfig {
  urls: string[];
  maxJobsPerRun: number;
  dryRun: boolean;
}

class JobMiner {
  private scraper: JobScraper;
  private config: MinerConfig;
  private rawDataDir: string;
  private lastGeminiCallTime: number = 0;
  private geminiCallCount: number = 0;
  private geminiCallResetTime: number = Date.now();
  
  constructor(config: MinerConfig) {
    this.config = config;
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
   * Main mining process
   */
  async mine(): Promise<void> {
    try {
      console.log('🔍 Starting Job Miner...');
      console.log(`📍 Target URLs: ${this.config.urls.join(', ')}`);
      console.log(`🎯 Max jobs per run: ${this.config.maxJobsPerRun}`);
      
      // Connect to database
      await connectDB();
      console.log('✓ Database connected');
      
      // First: Verify old jobs (30+ days old)
      await this.verifyOldJobs();
      
      let totalProcessed = 0;
      
      for (const sourceUrl of this.config.urls) {
        console.log(`\n🕷️  Scraping from: ${sourceUrl}`);
        
        // Get job listings
        const jobUrls = await this.scraper.getJobListings(sourceUrl);
        console.log(`📄 Found ${jobUrls.length} job listings`);
        
        let jobIndex = 0;
        for (const jobUrl of jobUrls) {
          jobIndex++;
          if (totalProcessed >= this.config.maxJobsPerRun) {
            console.log(`⏹️  Reached max jobs limit (${this.config.maxJobsPerRun})`);
            break;
          }
          
          // Check for duplicates
          const isDuplicate = await Job.findOne({ original_link: jobUrl });
          if (isDuplicate) {
            console.log(`⏭️  Skipping duplicate: ${jobUrl}`);
            continue;
          }
          
          // Scrape job page
          const html = await this.scraper.scrapeJobPage(jobUrl);
          if (!html) {
            console.log(`⚠️  Failed to scrape: ${jobUrl}`);
            continue;
          }
          
          // Save raw HTML before any processing
          this.saveRawHTML(html, jobUrl, jobIndex);
          
          // Clean HTML
          const cleanedHtml = this.scraper.cleanHTML(html);
          
          // Analyze with Gemini
          const aiJobData = await this.analyzeWithGemini(cleanedHtml, jobUrl);
          if (!aiJobData) {
            console.log(`⚠️  AI analysis failed for: ${jobUrl}`);
            continue;
          }
          
          // Normalize and save
          if (!this.config.dryRun) {
            try {
              const job = new Job(aiJobData);
              await job.save();
              console.log(`✓ Saved: ${aiJobData.job_title} at ${aiJobData.company_name}`);
            } catch (error) {
              console.error(`✗ Failed to save job: ${error}`);
            }
          } else {
            console.log(`[DRY RUN] Would save: ${aiJobData.job_title}`);
          }
          
          totalProcessed++;
        }
      }
      
      console.log(`\n🎉 Mining complete! Processed ${totalProcessed} jobs`);
    } catch (error) {
      console.error('❌ Mining failed:', error);
      process.exit(1);
    } finally {
      await this.scraper.close();
      process.exit(0);
    }
  }

  /**
   * Verify old jobs (30+ days old) and remove if no longer available
   * or update if content has changed
   */
  private async verifyOldJobs(): Promise<void> {
    try {
      console.log('\n📋 Verifying jobs older than 30 days...');
      
      // Calculate 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Find jobs that haven't been checked or were checked >30 days ago
      const jobsToCheck = await Job.find({
        $or: [
          { last_checked_at: null },
          { last_checked_at: { $lt: thirtyDaysAgo } }
        ]
      }).limit(50); // Process max 50 jobs per verification run
      
      console.log(`📊 Found ${jobsToCheck.length} jobs to verify`);
      
      let updated = 0;
      let removed = 0;
      
      for (const job of jobsToCheck) {
        try {
          // Skip if job doesn't have original_link
          if (!job.original_link) {
            console.log(`⚠️  Job missing original_link: ${job._id}`);
            continue;
          }
          
          // Try to scrape the job URL
          const html = await this.scraper.scrapeJobPage(job.original_link);
          
          if (!html) {
            // Job no longer available - mark as inactive
            console.log(`🗑️  Removing stale job: ${job.job_title}`);
            if (!this.config.dryRun) {
              await Job.findByIdAndUpdate(job._id, { 
                is_active: false, 
                last_checked_at: new Date() 
              });
            }
            removed++;
            continue;
          }
          
          // Job still available - check for changes
          const cleanedHtml = this.scraper.cleanHTML(html);
          const aiJobData = await this.analyzeWithGemini(cleanedHtml, job.original_link);
          
          if (aiJobData) {
            // Compare key fields to detect changes
            const hasChanges = this.hasJobChanges(job, aiJobData);
            
            if (hasChanges) {
              console.log(`✏️  Updating changed job: ${job.job_title}`);
              if (!this.config.dryRun) {
                // Update only the fields that changed
                await Job.findByIdAndUpdate(job._id, {
                  ...aiJobData,
                  last_checked_at: new Date(),
                  is_active: true
                });
              }
              updated++;
            } else {
              console.log(`✓ Job unchanged: ${job.job_title}`);
              if (!this.config.dryRun) {
                // Update last_checked_at without changing other fields
                await Job.findByIdAndUpdate(job._id, {
                  last_checked_at: new Date(),
                  is_active: true
                });
              }
            }
          } else {
            // Failed to analyze - update check time but keep the job
            if (!this.config.dryRun) {
              await Job.findByIdAndUpdate(job._id, {
                last_checked_at: new Date()
              });
            }
          }
        } catch (error) {
          console.error(`⚠️  Error verifying job ${job._id}: ${error}`);
          // Update last_checked_at even on error
          if (!this.config.dryRun) {
            await Job.findByIdAndUpdate(job._id, {
              last_checked_at: new Date()
            });
          }
        }
      }
      
      console.log(`✓ Verification complete: ${updated} updated, ${removed} removed`);
    } catch (error) {
      console.error('⚠️  Job verification failed:', error);
      // Don't stop mining if verification fails
    }
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
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        console.log('📌 Using HTML parser fallback (no API key)...');
        return this.parseJobFromHTML(html, jobUrl);
      }
      
      // Free tier rate limits: 15 requests per minute, 1.5M tokens per day
      // Add delay between requests to stay under limit
      const timeSinceLastCall = Date.now() - this.lastGeminiCallTime;
      const minDelayMs = 4000; // 4 second minimum delay = ~15 requests/min
      
      if (timeSinceLastCall < minDelayMs) {
        const delayNeeded = minDelayMs - timeSinceLastCall;
        console.log(`⏳ Rate limiting: waiting ${delayNeeded}ms before next Gemini call...`);
        await new Promise(resolve => setTimeout(resolve, delayNeeded));
      }
      
      // Reset call counter every minute
      const timeSinceReset = Date.now() - this.geminiCallResetTime;
      if (timeSinceReset > 60000) {
        this.geminiCallCount = 0;
        this.geminiCallResetTime = Date.now();
      }
      
      // Check if we're approaching the rate limit
      if (this.geminiCallCount >= 14) {
        const waitTime = 60000 - timeSinceReset + 1000;
        console.log(`⚠️  Approaching rate limit (${this.geminiCallCount}/15). Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.geminiCallCount = 0;
        this.geminiCallResetTime = Date.now();
      }
      
      console.log('🤖 Analyzing with Gemini API...');
      
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const prompt = createJobAnalysisPrompt(html);
      
      this.lastGeminiCallTime = Date.now();
      this.geminiCallCount++;
      
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
      
      // Handle 429 Too Many Requests with exponential backoff
      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('Too Many Requests')) {
        if (retryCount < 3) {
          const backoffMs = Math.pow(2, retryCount) * 60000; // 1min, 2min, 4min
          console.warn(`⚠️  Rate limited. Retrying in ${Math.ceil(backoffMs / 1000)}s (attempt ${retryCount + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          return this.analyzeWithGemini(html, jobUrl, retryCount + 1);
        } else {
          console.error('❌ Max retries exceeded for Gemini API. Using fallback...');
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
 * Usage: tsx src/miner.ts
 */
async function main() {
  const config: MinerConfig = {
    urls: [
      'https://www.ausbildung.de/suche/?search=Anwendungsentwicklung%7C&apprenticeshipType=Ausbildung',
      'https://www.azubiyo.de/stellenmarkt/?subject=Anwendungsentwicklung',
    ],
    maxJobsPerRun: 100,
    dryRun: process.env.DEMO_MODE === 'true', // Dry run in demo mode
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
