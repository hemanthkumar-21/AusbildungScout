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
        } else if (listingUrl.includes('azubiyo.de')) {
          const baseUrl = 'https://www.azubiyo.de';
          jobUrls = await this.scrapeAzubiyo(page, baseUrl);
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
   * Scrape ausbildung.de for job listings
   */
  private async scrapeAusbildungDe(page: Page, baseUrl: string): Promise<string[]> {
    try {
      console.log('Scraping ausbildung.de using pagination API...');
      
      const jobUrls = new Set<string>();
      const searchQuery = 'Anwendungsentwicklung|';
      let from = 0;
      const pageSize = 20;
      
      // First, load the main page to establish session and get cookies
      await page.goto(`${baseUrl}/suche/?search=${encodeURIComponent(searchQuery)}&apprenticeshipType=Ausbildung`, {
        waitUntil: 'networkidle2',
      });
      console.log('✓ Loaded search page to establish session', `${baseUrl}/suche/?search=${encodeURIComponent(searchQuery)}&apprenticeshipType=Ausbildung`);
      // Get cookies from page
      const cookies = await page.cookies();
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      
      // Get the next-action value from the page
      const nextAction = await page.evaluate(() => {
        const meta = document.querySelector('meta[property="next-action"]');
        return meta?.getAttribute('content') || '7fa11ce890df80ea4c45f45a2021e6936212baf10c';
      });
      
      // Get router state
      const routerState = await page.evaluate(() => {
        const meta = document.querySelector('meta[property="next-router-state-tree"]');
        return meta?.getAttribute('content') || '%5B%22%22%2C%7B%22children%22%3A%5B%22(default)%22%2C%7B%22children%22%3A%5B%22suche%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D';
      });
      
      console.log(`Got cookies and next-action: ${nextAction}`);
      
      // First API call to get total vacancies count
      let totalVacancies = 469; // Default fallback
      try {
        const firstResponse = await fetch(`${baseUrl}/suche/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
            'Accept': 'text/x-component',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'next-action': nextAction,
            'next-router-state-tree': routerState,
            'Origin': baseUrl,
            'Referer': `${baseUrl}/suche/?search=${encodeURIComponent(searchQuery)}&apprenticeshipType=Ausbildung`,
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': cookieString,
          },
          body: JSON.stringify([{ search: searchQuery, from: 0 }]),
        });
        
        if (firstResponse.ok) {
          const firstText = await firstResponse.text();
          // Try to extract vacanciesCount from metadata
          const vacanciesMatch = firstText.match(/"vacanciesCount":(\d+)/);
          if (vacanciesMatch && vacanciesMatch[1]) {
            // Cap to 500 since we slice to 500 anyway
            totalVacancies = Math.min(parseInt(vacanciesMatch[1], 10), 500);
            console.log(`📊 Total vacancies available: ${totalVacancies}`);
          }
        }
      } catch (error) {
        console.warn('Could not fetch vacancies count, using default:', error);
      }
      
      // Paginate through results using direct API calls - dynamically based on actual count
      while (jobUrls.size < totalVacancies) {
        try {
          console.log(`Fetching results from position ${from}... (${jobUrls.size}/${totalVacancies})`);
          
          const response = await fetch(`${baseUrl}/suche/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain;charset=UTF-8',
              'Accept': 'text/x-component',
              'Accept-Language': 'en-US,en;q=0.9',
              'Cache-Control': 'no-cache',
              'next-action': nextAction,
              'next-router-state-tree': routerState,
              'Origin': baseUrl,
              'Referer': `${baseUrl}/suche/?search=${encodeURIComponent(searchQuery)}&apprenticeshipType=Ausbildung`,
              'Sec-Fetch-Dest': 'empty',
              'Sec-Fetch-Mode': 'cors',
              'Sec-Fetch-Site': 'same-origin',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Cookie': cookieString,
            },
            body: JSON.stringify([{ search: searchQuery, from }]),
          });
          
          if (!response.ok) {
            console.error(`API error: ${response.status}`);
            break;
          }
          
          const responseText = await response.text();
          console.log(`Got response of ${responseText.length} bytes`);
          
          // Parse the RSC response
          const hits = this.parseAusbildungDeResponse(responseText);
          
          if (!hits || hits.length === 0) {
            console.log('No more results in response');
            break;
          }
          
          hits.forEach((job: any) => {
            if (job.vacancyData?.slug) {
              const url = `${baseUrl}/stellen/${job.vacancyData.slug}/`;
              jobUrls.add(url);
            }
          });
          
          console.log(`Got ${hits.length} results, total: ${jobUrls.size}/${totalVacancies}`);
          from += pageSize;
          
          // Continue pagination - don't break on fewer results yet
          // The API may return fewer results on last page
          if (hits.length === 0) {
            console.log('Reached end of results (empty page)');
            break;
          }
          
          // Rate limiting
          await randomDelay(800, 1500);
        } catch (error) {
          console.error('Error in pagination loop:', error);
          break;
        }
      }
      
      const urlArray = Array.from(jobUrls).slice(0, 500);
      console.log(`Extracted ${urlArray.length} job URLs from ausbildung.de (total available: ${totalVacancies})`);
      return urlArray;
    } catch (error) {
      console.error('Error scraping ausbildung.de:', error);
      return [];
    }
  }
  
  private parseAusbildungDeResponse(responseText: string): any[] {
    try {
      // The RSC response contains streaming format with chunks
      // Each chunk starts with a number followed by a colon
      // We're looking for chunk 1 which contains: 1:{"data":{"hits":{"primary":[...]}}}
      
      // Find all lines that start with "1:"
      const lines = responseText.split('\n');
      
      for (const line of lines) {
        // Look for lines that contain the data chunk
        if (line.includes('"hits"') && line.includes('"primary"')) {
          try {
            // Extract JSON part - skip the "1:" prefix if present
            let jsonStr = line;
            if (line.startsWith('1:')) {
              jsonStr = line.substring(2);
            }
            
            // Try to parse as JSON
            const data = JSON.parse(jsonStr);
            
            // Navigate to find the hits array
            if (data.data?.hits?.primary) {
              console.log(`✓ Found ${data.data.hits.primary.length} results via data.hits.primary`);
              return data.data.hits.primary;
            }
          } catch (e) {
            // Continue to next strategy
          }
        }
      }
      
      // Strategy 2: Direct array search - look for the array itself
      const arrayMatch = responseText.match(/\[\s*\{\s*"jobPostingClusterData"[\s\S]*?\}(?=,"extended":|])/);
      if (arrayMatch) {
        try {
          const jsonStr = '[' + arrayMatch[0] + ']';
          const jobs = JSON.parse(jsonStr);
          console.log(`✓ Found ${jobs.length} results via direct array parsing`);
          return jobs;
        } catch (e) {
          // Continue
        }
      }
      
      console.log(`⚠️  No valid hits found in response (length: ${responseText.length})`);
      return [];
    } catch (e) {
      console.error('Error parsing response:', e);
      return [];
    }
  }
  
  
  /**
   * Scrape azubiyo.de for job listings with pagination support
   * Structure: https://www.azubiyo.de/stellenmarkt/?subject=it&jobtype=1
   * Pagination: /stellenmarkt/2/?subject=it&jobtype=1, /stellenmarkt/3/?subject=it&jobtype=1
   */
  private async scrapeAzubiyo(page: Page, baseUrl: string): Promise<string[]> {
    try {
      const jobUrls = new Set<string>();
      const currentUrl = page.url();
      
      // Extract base URL parameters
      const urlObj = new URL(currentUrl);
      const params = new URLSearchParams(urlObj.search);
      const subject = params.get('subject') || 'Anwendungsentwicklung';
      const jobtype = params.get('jobtype') || '1';
      
      console.log(`🔍 Scraping azubiyo.de for subject=${subject}, jobtype=${jobtype}`);
      
      // Pagination loop - scrape multiple pages
      let pageNum = 1;
      let maxPages = 10; // Limit to prevent infinite loops
      
      while (pageNum <= maxPages) {
        try {
          // Human-like delay between pages
          await humanDelay();
          
          // Construct pagination URL
          let paginatedUrl: string;
          if (pageNum === 1) {
            paginatedUrl = `${baseUrl}/stellenmarkt/?subject=${subject}&jobtype=${jobtype}`;
          } else {
            paginatedUrl = `${baseUrl}/stellenmarkt/${pageNum}/?subject=${subject}&jobtype=${jobtype}`;
          }
          
          console.log(`📄 Fetching page ${pageNum}: ${paginatedUrl}`);
          
          // Navigate to page
          await page.goto(paginatedUrl, {
            waitUntil: 'networkidle2',
            timeout: 50000,
          });
          
          // Human-like interaction on page
          await humanLikeInteraction(page);
          
          // Save page HTML for debugging
          const html = await page.content();
          const dir = 'page_debug';
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(
            path.join(dir, `azubiyo_de_page_${pageNum}.html`),
            html,
            'utf-8'
          );
          console.log(`✓ Page ${pageNum} saved to: page_debug/azubiyo_de_page_${pageNum}.html`);
          
          // Wait for any lazy loading
          await page.evaluate(() => new Promise(r => setTimeout(r, 1000)));
          
          // Extract job URLs from page
          const pageJobUrls = await page.evaluate((base: string) => {
            const links: string[] = [];
            const seenUrls = new Set<string>();
            
            // Target the job offer cards in the list structure:
            // <li class="col-md-6 col-lg-12 mb-4">
            //   <div id="jB19A38G6" data-ng-click="...">
            //     <a href="/stellenanzeigen/ausbildung-zum-fachlageristen-w-m-d_gc-gruppe_b19a38g6/" ...>
            
            // Primary selector: job listing items with links
            const jobItems = document.querySelectorAll('li[class*="col-md-6"] a[href*="/stellenanzeigen/"]');
            
            jobItems.forEach((el: any) => {
              const href = el.getAttribute('href');
              
              if (href && href.includes('/stellenanzeigen/')) {
                let url = href;
                
                // Handle relative URLs
                if (!url.startsWith('http')) {
                  url = new URL(href, document.location.href).href;
                }
                
                // Avoid duplicates
                if (!seenUrls.has(url)) {
                  seenUrls.add(url);
                  links.push(url);
                }
              }
            });
            
            // Fallback: Try alternative selectors
            if (links.length === 0) {
              const altSelectors = [
                'a[href*="/stellenanzeigen/"]',
                '[class*="job-search-job-offer"] a[href*="/stellenanzeigen/"]',
                '[class*="job-offer-teaser"] a[href*="/stellenanzeigen/"]',
              ];
              
              for (const selector of altSelectors) {
                try {
                  const elements = document.querySelectorAll(selector);
                  elements.forEach((el: any) => {
                    const href = el.getAttribute('href');
                    
                    if (href && href.includes('/stellenanzeigen/')) {
                      let url = href;
                      
                      if (!url.startsWith('http')) {
                        url = new URL(href, document.location.href).href;
                      }
                      
                      if (!seenUrls.has(url)) {
                        seenUrls.add(url);
                        links.push(url);
                      }
                    }
                  });
                  
                  if (links.length > 0) break;
                } catch (e) {
                  // Continue to next selector
                }
              }
            }
            
            return Array.from(seenUrls);
          }, baseUrl);
          
          console.log(`✓ Found ${pageJobUrls.length} job listings on page ${pageNum}`);
          
          // Add URLs to set
          pageJobUrls.forEach(url => jobUrls.add(url));
          
          // Stop if no jobs found (likely reached end of results)
          if (pageJobUrls.length === 0) {
            console.log('⚠️  No jobs found on this page. Likely reached end of results.');
            break;
          }
          
          // Stop if we have enough jobs
          if (jobUrls.size >= 500) {
            console.log('📈 Reached target of 500 jobs');
            break;
          }
          
          // Rate limiting between pages
          await randomDelay(2000, 4000);
          pageNum++;
        } catch (error) {
          console.warn(`⚠️  Error processing page ${pageNum}:`, error);
          break;
        }
      }
      
      const urlArray = Array.from(jobUrls);
      console.log(`✓ Extracted ${urlArray.length} total job URLs from azubiyo.de`);
      return urlArray;
    } catch (error) {
      console.error('❌ Error scraping azubiyo.de:', error);
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
