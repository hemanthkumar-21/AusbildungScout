/**
 * Scraper (Phase A)
 * Mimics human browsing to collect job postings
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';

interface ScraperConfig {
  minDelayMs: number;
  maxDelayMs: number;
  maxRetries: number;
  headless: boolean;
}

const defaultConfig: ScraperConfig = {
  minDelayMs: 2000,
  maxDelayMs: 5000,
  maxRetries: 3,
  headless: true,
};

/**
 * Random delay between min and max milliseconds to mimic human behavior
 */
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * User-Agent rotation for different browsers and devices
 */
function getRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)]!;
}

/**
 * Random viewport size for realistic browsing
 */
function getRandomViewport(): { width: number; height: number } {
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
  ];
  return viewports[Math.floor(Math.random() * viewports.length)]!;
}

/**
 * Simulate human scrolling and interaction
 */
async function humanLikeInteraction(page: Page): Promise<void> {
  // Random scrolling pattern
  const scrolls = Math.floor(Math.random() * 3) + 1; // 1-3 scrolls
  for (let i = 0; i < scrolls; i++) {
    const distance = Math.floor(Math.random() * 500) + 200; // 200-700px
    await page.evaluate((dist) => window.scrollBy(0, dist), distance);
    await randomDelay(300, 800);
  }
  
  // Random mouse movements
  if (Math.random() > 0.5) {
    const x = Math.floor(Math.random() * 1000);
    const y = Math.floor(Math.random() * 500);
    await page.mouse.move(x, y);
    await randomDelay(100, 300);
  }
  
  // Return to top
  await page.evaluate(() => window.scrollTo(0, 0));
}

/**
 * Realistic human-like delay with occasional longer pauses
 */
async function humanDelay(): Promise<void> {
  // 80% normal delays, 20% longer "thinking" pauses
  if (Math.random() > 0.8) {
    // Occasional longer pause (thinking/reading)
    await randomDelay(5000, 15000);
  } else {
    // Normal browsing delay
    await randomDelay(1500, 4000);
  }
}

/**
 * Scraper class for collecting job postings
 * NOTE: This is a stub implementation for demo mode
 * In production (local machine), use Puppeteer to:
 * 1. Visit ausbildung.de or arbeitsagentur.de
 * 2. Extract job links
 * 3. Visit each job, scrape HTML
 * 4. Pass to Gemini API for analysis
 */
export class JobScraper {
  private config: ScraperConfig;
  private browser: Browser | null = null;
  private debugDir = 'page_debug';
  
  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    // Ensure debug directory exists
    if (!fs.existsSync(this.debugDir)) {
      fs.mkdirSync(this.debugDir, { recursive: true });
    }
  }
  
  /**
   * Initialize Puppeteer browser
   */
  private async initBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }
    
    try {
      this.browser = await puppeteer.launch({
        headless: this.config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled', // Hide automation detection
          '--disable-dev-shm-usage',
        ],
      });
      console.log('✓ Puppeteer browser launched');
      return this.browser;
    } catch (error) {
      console.error('❌ Failed to launch Puppeteer:', error);
      throw error;
    }
  }
  
  /**
   * Setup page with human-like properties
   */
  private async setupPage(page: Page): Promise<void> {
    // Set random user agent
    await page.setUserAgent(getRandomUserAgent());
    
    // Set random viewport
    const viewport = getRandomViewport();
    await page.setViewport(viewport);
    
    // Set realistic headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'max-age=0',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1',
    });
  }
  
  /**
   * Scrape a single job page
   * Returns the full HTML content
   */
  async scrapeJobPage(url: string): Promise<string | null> {
    let page: Page | null = null;
    let retries = 0;
    
    while (retries < this.config.maxRetries) {
      try {
        // Human-like delay before request
        await humanDelay();
        
        const browser = await this.initBrowser();
        page = await browser.newPage();
        
        // Setup human-like page properties
        await this.setupPage(page);
        
        console.log(`🌐 Scraping job page: ${url}`);
        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 50000 
        });
        
        // Human-like interaction on page
        await humanLikeInteraction(page);
        
        const html = await page.content();
        await page.close();
        
        return html;
      } catch (error) {
        retries++;
        console.warn(`⚠️  Attempt ${retries}/${this.config.maxRetries} failed for ${url}:`, error);
        
        if (page) {
          try {
            await page.close();
          } catch (e) {
            // Ignore close errors
          }
        }
        
        if (retries >= this.config.maxRetries) {
          console.error(`❌ Failed to scrape ${url} after ${this.config.maxRetries} attempts`);
          return null;
        }
        
        // Exponential backoff for retries
        const backoffDelay = Math.pow(2, retries) * 1000; // 2s, 4s, 8s
        await randomDelay(backoffDelay, backoffDelay + 2000);
      }
    }
    
    return null;
  }
  
  /**
   * Get list of job URLs from a listing page
   */
  async getJobListings(listingUrl: string): Promise<string[]> {
    let page: Page | null = null;
    let retries = 0;
    
    while (retries < this.config.maxRetries) {
      try {
        // Human-like delay before request
        await humanDelay();
        
        const browser = await this.initBrowser();
        page = await browser.newPage();
        
        // Setup human-like page properties
        await this.setupPage(page);
        
        console.log(`🔗 Fetching job listings from: ${listingUrl}`);
        await page.goto(listingUrl, { 
          waitUntil: 'networkidle2',
          timeout: 50000 
        });
        
        // Human-like interaction on page
        await humanLikeInteraction(page);
        
        let jobUrls: string[] = [];
        
        // Scrape based on domain
        if (listingUrl.includes('ausbildung.de')) {
          const baseUrl = 'https://www.ausbildung.de';
          jobUrls = await this.scrapeAusbildungDe(page, baseUrl);
        }
        
        await page.close();
        console.log(`📄 Found ${jobUrls.length} job listings`);
        
        return jobUrls;
      } catch (error) {
        retries++;
        console.warn(`⚠️  Attempt ${retries}/${this.config.maxRetries} failed for ${listingUrl}:`, error);
        
        if (page) {
          try {
            await page.close();
          } catch (e) {
            // Ignore close errors
          }
        }
        
        if (retries >= this.config.maxRetries) {
          console.error(`❌ Failed to fetch listings from ${listingUrl} after ${this.config.maxRetries} attempts`);
          return [];
        }
        
        // Exponential backoff for retries
        const backoffDelay = Math.pow(2, retries) * 1000;
        await randomDelay(backoffDelay, backoffDelay + 2000);
      }
    }
    
    return [];
  }
  
  /**
   * Scrape ausbildung.de for job listings from page HTML
   */
  private async scrapeAusbildungDe(page: Page, baseUrl: string): Promise<string[]> {
    try {
      console.log('Scraping ausbildung.de from page HTML...');
      
      const jobUrls = new Set<string>();
      const searchQuery = 'Anwendungsentwicklung|';
      const apprenticeshipType = 'Ausbildung';
      
      const searchUrl = `${baseUrl}/suche/?search=${encodeURIComponent(searchQuery)}&apprenticeshipType=${apprenticeshipType}`;
      
      // Load the search page
      await page.goto(searchUrl, {
        waitUntil: 'networkidle2',
      });
      console.log('✓ Loaded search page');
      
      // Wait for content to load
      await randomDelay(3000, 4000);
      
      // Try to extract total vacancy count
      const totalVacancies = await page.evaluate(() => {
        // Look in script tags for vacanciesCount
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const content = script.textContent || '';
          const match = content.match(/"vacanciesCount":(\d+)/);
          if (match && match[1]) {
            return parseInt(match[1], 10);
          }
        }
        
        // Look in page text for "X Ausbildungsplätze" or similar
        const bodyText = document.body.innerText;
        const textMatch = bodyText.match(/(\d+)\s*(?:Ausbildungsplätze|Stellen|Treffer)/i);
        if (textMatch && textMatch[1]) {
          return parseInt(textMatch[1], 10);
        }
        
        return 0;
      });
      
      if (totalVacancies > 0) {
        console.log(`📊 Total vacancies available: ${totalVacancies}`);
      }
      
      // Extract job URLs from the page HTML
      const extractedUrls = await page.evaluate((base: string) => {
        const urls: string[] = [];
        
        // Strategy 1: Look for links to /stellen/ in the HTML
        const jobLinks = document.querySelectorAll('a[href*="/stellen/"]');
        jobLinks.forEach((link: any) => {
          const href = link.getAttribute('href');
          if (href && href.includes('/stellen/') && !href.includes('?')) {
            let url = href;
            if (!url.startsWith('http')) {
              url = base + (href.startsWith('/') ? href : '/' + href);
            }
            if (!urls.includes(url)) {
              urls.push(url);
            }
          }
        });
        
        // Strategy 2: Look for data in script tags (Next.js data)
        const scripts = document.querySelectorAll('script');
        scripts.forEach((script) => {
          const content = script.textContent || '';
          if (content.includes('"slug"')) {
            // Extract slugs from JSON data
            const slugMatches = content.matchAll(/"slug":"([^"]+)"/g);
            for (const match of slugMatches) {
              if (match[1]) {
                const url = `${base}/stellen/${match[1]}/`;
                if (!urls.includes(url)) {
                  urls.push(url);
                }
              }
            }
          }
        });
        
        return urls;
      }, baseUrl);
      
      extractedUrls.forEach(url => jobUrls.add(url));
      console.log(`✓ Found ${jobUrls.size} jobs from initial page`);
      
      // Determine target count
      const targetCount = totalVacancies > 0 ? Math.min(totalVacancies, 500) : 500;
      
      // Calculate dynamic max scrolls based on target (estimate ~20 jobs per scroll)
      const estimatedScrollsNeeded = Math.ceil((targetCount - jobUrls.size) / 20);
      const maxScrolls = Math.min(Math.max(estimatedScrollsNeeded + 10, 30), 100); // Between 30-100 scrolls
      
      // Try scrolling to load more
      if (jobUrls.size < targetCount) {
        console.log(`📜 Scrolling to load more jobs (target: ${targetCount}, max scrolls: ${maxScrolls})...`);
        
        let previousCount = jobUrls.size;
        let noNewResultsCount = 0;
        
        for (let i = 0; i < maxScrolls && jobUrls.size < targetCount; i++) {
          // Scroll to bottom
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          
          // Increased wait time for lazy loading
          await randomDelay(3000, 5000);
          
          // Extract new URLs
          const newUrls = await page.evaluate((base: string) => {
            const urls: string[] = [];
            
            // Look for all job links
            const jobLinks = document.querySelectorAll('a[href*="/stellen/"]');
            jobLinks.forEach((link: any) => {
              const href = link.getAttribute('href');
              if (href && href.includes('/stellen/') && !href.includes('?')) {
                let url = href;
                if (!url.startsWith('http')) {
                  url = base + (href.startsWith('/') ? href : '/' + href);
                }
                urls.push(url);
              }
            });
            
            return urls;
          }, baseUrl);
          
          newUrls.forEach(url => jobUrls.add(url));
          
          if (jobUrls.size > previousCount) {
            console.log(`  ✓ Scroll ${i + 1}: ${jobUrls.size}/${targetCount} jobs`);
            noNewResultsCount = 0;
            previousCount = jobUrls.size;
          } else {
            noNewResultsCount++;
            // Wait for 5 scrolls without new results
            if (noNewResultsCount >= 5) {
              console.log(`  ⚠️ No new results after 5 scrolls, stopping at ${jobUrls.size}/${targetCount}`);
              break;
            }
          }
        }
      }
      
      const urlArray = Array.from(jobUrls);
      console.log(`✓ Extracted ${urlArray.length} job URLs from ausbildung.de`);
      return urlArray;
    } catch (error) {
      console.error('❌ Error scraping ausbildung.de:', error);
      return [];
    }
  }

  /**
   * Check for duplicates before processing
   */
  async isDuplicate(url: string, checkFn: (url: string) => Promise<boolean>): Promise<boolean> {
    return await checkFn(url);
  }
  
  /**
   * Clean HTML to extract meaningful text
   * Removes scripts, styles, and unnecessary whitespace
   */
  cleanHTML(html: string): string {
    return html
      // Remove scripts
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove styles
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Close browser connection
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('✓ Puppeteer browser closed');
    }
  }
}

export default JobScraper;
