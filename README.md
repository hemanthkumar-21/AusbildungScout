# AusbildungScout

**A German apprenticeship (Ausbildung) job aggregator and market analyzer platform** that combines web scraping, AI-powered data enrichment, and real-time market analytics.

## 🎯 Overview

AusbildungScout is an intelligent platform designed to help job seekers discover and analyze apprenticeship opportunities across German job platforms. The system automates job data collection, enriches job listings with AI-generated insights, and provides comprehensive market statistics.

## ✨ Features

### Core Capabilities
- **Automated Job Scraping**: Intelligent crawling of German job platforms (ausbildung.de)
- **AI-Powered Analysis**: Uses Google Gemini API to extract structured data from unstructured job postings
- **Salary Intelligence**: Multi-source salary resolution combining web scraping, tariff agreements, and contextual analysis
- **Real-time Market Analytics**: Aggregated statistics on market trends, salary ranges, and hiring patterns
- **Advanced Filtering**: Comprehensive search filters including language requirements, visa sponsorship, and benefits
- **Historical Tracking**: Preserves job history and vacancy changes over time

### Data Enrichment
- **Salary Standardization**: Converts various salary formats to standardized monthly EUR amounts
- **Tariff Agreement Mapping**: Identifies collective bargaining agreements and corresponding salary standards
- **Language Level Classification**: Categorizes German and English proficiency requirements
- **Benefit Normalization**: Standardizes diverse benefit descriptions into comparable tags
- **Tech Stack Detection**: Identifies required programming languages and technologies
- **Relocation Support Tracking**: Documents housing and mobility assistance programs

## 🏗️ Architecture

### System Design

```
┌─────────────────────────────────────────────────┐
│          Frontend (React + Vite)                │
│  • Job listing & filtering                      │
│  • Detailed job views                           │
│  • Market statistics dashboard                  │
└──────────────┬──────────────────────────────────┘
               │ REST API
┌──────────────▼──────────────────────────────────┐
│        Backend (Node.js + Express)              │
│  • REST API endpoints                           │
│  • MongoDB queries & aggregations               │
│  • Response formatting & pagination             │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│      Data Pipeline (Background Worker)          │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Phase 1: Scraping                       │   │
│  │ • Puppeteer-based web scraping          │   │
│  │ • Cookie consent handling               │   │
│  │ • Rate limiting & user-agent rotation   │   │
│  └─────────────────────────────────────────┘   │
│                     ↓                           │
│  ┌─────────────────────────────────────────┐   │
│  │ Phase 2: AI Enrichment (Gemini)         │   │
│  │ • Structured data extraction            │   │
│  │ • API key rotation & rate limiting      │   │
│  │ • Fallback HTML parsing                 │   │
│  └─────────────────────────────────────────┘   │
│                     ↓                           │
│  ┌─────────────────────────────────────────┐   │
│  │ Phase 3: Salary Enrichment              │   │
│  │ • Tariff mapping                        │   │
│  │ • Description parsing                   │   │
│  │ • Company website lookup (optional)     │   │
│  └─────────────────────────────────────────┘   │
│                     ↓                           │
│  ┌─────────────────────────────────────────┐   │
│  │ Phase 4: Database Persistence           │   │
│  │ • MongoDB storage                       │   │
│  │ • Vacancy change tracking               │   │
│  │ • Inactive job marking                  │   │
│  └─────────────────────────────────────────┘   │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│   MongoDB Database                              │
│  • Job documents with full enrichment           │
│  • Historical snapshots                         │
│  • Market statistics                            │
└─────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.x
- **Database**: MongoDB 9.x
- **Language**: TypeScript 5.x
- **Web Scraping**: Puppeteer 24.x (for browser automation)
- **HTML Parsing**: Cheerio 1.x
- **API**: Google GenAI SDK (Gemini 3.1 Flash Lite)
- **HTTP Client**: Axios 1.x

### Frontend
- **Framework**: React 19.x
- **Build Tool**: Vite 7.x
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.x
- **Routing**: React Router v7
- **UI Notifications**: React Toastify 11.x
- **HTTP Client**: Axios 1.x

### DevTools
- **Task Runner**: tsx (for TypeScript execution)
- **Dev Server**: Nodemon (hot reload)
- **Linting**: ESLint 9.x + TypeScript ESLint
- **Package Manager**: npm or yarn

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher (or yarn)
- MongoDB 5.0 or higher (cloud via MongoDB Atlas or local installation)
- Google Gemini API key (for AI enrichment)
- Modern web browser (Chrome, Firefox, Safari, Edge)

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/hemanthkumar-21/AusbildungScout.git
cd AusbildungScout
```

### 2. Environment Configuration

Create a `.env` file in the backend directory:

```bash
cd backend
cat > .env << EOF
# Server Configuration
PORT=5000
NODE_ENV=production

# Database
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/ausbildungscout

# Frontend Configuration
FRONTEND_URL=http://localhost:3000

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
# Optional: Multiple API keys (comma-separated) for rate limiting
GEMINI_API_KEYS=key1,key2,key3

# Scraper Configuration
SCRAPER_MIN_DELAY_MS=2000
SCRAPER_MAX_DELAY_MS=5000

# Demo Mode
DEMO_MODE=false
EOF
```

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:5000/api
EOF
```

## 🎯 Running the Application

### Development Mode

**Terminal 1 - Backend Server:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend Development Server:**
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:5173
```

**Terminal 3 - Job Miner (Background Worker):**
```bash
cd backend
npm run mine
# Runs the job scraping and enrichment pipeline
```

### Production Mode

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm preview
```

### Database Setup

If using MongoDB Atlas:

1. Create a cluster at https://www.mongodb.com/cloud/atlas
2. Create a database user with appropriate permissions
3. Add your IP to the network whitelist
4. Copy the connection string to `MONGO_URI` in `.env`

For local MongoDB:

```bash
# macOS (via Homebrew)
brew services start mongodb-community

# Linux (Ubuntu/Debian)
sudo systemctl start mongod

# Windows
# Start from Services or run: mongod
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Endpoints

#### 1. Get Jobs with Filters

**GET** `/jobs`

Query Parameters:
- `page` (number): Page number for pagination (default: 1)
- `limit` (number): Items per page (default: 20)
- `germanLevel` (string): Filter by German language requirement
- `visaNeed` (boolean): Filter jobs offering visa sponsorship
- `minSalary` (number): Minimum salary in EUR/month
- `maxSalary` (number): Maximum salary in EUR/month
- `startDate` (string): Filter by start date
- `educationLevel` (string): Required education level
- `search` (string): Full-text search term
- `tariffTypes` (string): Comma-separated tariff agreements
- `relocationSupport` (boolean): Filter jobs with relocation support
- `sortBy` (string): Sort field (salary, date, relevance)

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65abc123...",
      "job_title": "Fachinformatiker/in Systemintegration",
      "company_name": "TechCorp GmbH",
      "locations": [{"city": "Berlin", "state": "Germany"}],
      "salary": {"firstYearSalary": 950, "thirdYearSalary": 1200, "average": 1050},
      "german_level_requirement": "B2",
      "visa_sponsorship": true,
      "benefits_tags": ["laptop", "home_office", "health_insurance"]
    }
  ],
  "pagination": {
    "total": 1250,
    "page": 1,
    "limit": 20,
    "pages": 63
  }
}
```

#### 2. Get Single Job

**GET** `/jobs/:id`

**Response Example:**
```json
{
  "success": true,
  "data": {
    "_id": "65abc123...",
    "job_title": "Fachinformatiker/in",
    "company_name": "TechCorp GmbH",
    "description": "Full job description...",
    "salary": {...},
    "benefits": [...],
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### 3. Search Jobs

**GET** `/jobs/search?q=keyword`

Performs full-text search across job titles, descriptions, and company names.

#### 4. Market Statistics

**GET** `/stats`

**Response Example:**
```json
{
  "success": true,
  "data": {
    "totalJobs": 5420,
    "salaryStats": {
      "avgSalary": 1050,
      "minSalary": 450,
      "maxSalary": 2500
    },
    "languageStats": [
      {"_id": "B2", "count": 2150},
      {"_id": "B1", "count": 1800}
    ],
    "visaSponsorshipJobs": 1250,
    "visaSponsorshipPercentage": "23.07%"
  }
}
```

#### 5. Health Check

**GET** `/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "mode": "production"
}
```

## 📂 Project Structure

```
AusbildungScout/
├── backend/
│   ├── src/
│   │   ├── index.ts                 # Express server entry point
│   │   ├── miner.ts                 # Background worker for job mining
│   │   ├── db/
│   │   │   └── index.ts             # MongoDB connection setup
│   │   ├── model/
│   │   │   ├── job.ts               # Job schema & model
│   │   │   └── index.ts             # Model exports
│   │   ├── routes/
│   │   │   ├── jobs.ts              # Route definitions
│   │   │   └── jobs.controller.ts   # Route handlers
│   │   ├── types/
│   │   │   ├── job.types.ts         # TypeScript interfaces
│   │   │   └── index.ts             # Type exports
│   │   ├── utils/
│   │   │   ├── scraper.ts           # Puppeteer-based web scraper
│   │   │   ├── gemini-pipeline.ts   # AI data enrichment pipeline
│   │   │   ├── salary-resolver.ts   # Salary extraction & standardization
│   │   │   ├── tariff-salary-mapper.ts  # Tariff agreement mappings
│   │   │   ├── normalizer.ts        # Benefit & tech stack normalization
│   │   │   ├── filters.ts           # Query filter builders
│   │   │   └── company-benefits-fetcher.ts  # Company website lookup
│   │   └── miner_logs/              # Mining operation logs
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                 # React entry point
│   │   ├── App.tsx                  # Root component
│   │   ├── api.ts                   # API client configuration
│   │   ├── types.ts                 # Shared TypeScript types
│   │   ├── index.css                # Global styles
│   │   ├── components/
│   │   │   ├── JobCard.tsx          # Job listing card
│   │   │   ├── JobDetails.tsx       # Job details view
│   │   │   ├── FilterSidebar.tsx    # Filter panel
│   │   │   └── Pagination.tsx       # Pagination component
│   │   ├── pages/
│   │   │   ├── JobListPage.tsx      # Main job listing page
│   │   │   └── JobDetailsPage.tsx   # Individual job detail page
│   │   └── assets/                  # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── .env.example
│
├── README.md
└── .gitignore
```

## 🔧 Development Guidelines

### Code Standards

1. **TypeScript**: All code must be properly typed
2. **Naming**: Use camelCase for variables/functions, PascalCase for classes/types
3. **Error Handling**: Always handle errors gracefully with try-catch or error middleware
4. **Comments**: Keep comments minimal; code should be self-documenting
5. **Imports**: Organize imports alphabetically; use absolute paths with @ alias

### Database Modeling

The Job model includes:
- Core fields: title, company, location, description
- Salary data: first/third year salary, average, source, confidence
- Language requirements: German and English proficiency levels
- Tariff agreement information for salary standards
- Benefits categorization and tech stack
- Relocation support details
- Hiring process information
- Timestamps for tracking updates and inactivity

### API Design

- RESTful endpoints following standard conventions
- Pagination for large result sets (default 20 items/page)
- Error responses with consistent `success` and `error` fields
- Query parameter-based filtering for complex searches
- Rate limiting on external API calls (Gemini, company websites)

### Environment Variables

| Variable | Required | Example |
|----------|----------|---------|
| MONGO_URI | Yes | mongodb+srv://user:pass@cluster.mongodb.net/db |
| GEMINI_API_KEY | Yes | AIzaSy... |
| PORT | No | 5000 |
| FRONTEND_URL | No | http://localhost:3000 |
| SCRAPER_MIN_DELAY_MS | No | 2000 |
| SCRAPER_MAX_DELAY_MS | No | 5000 |
| NODE_ENV | No | development |
| DEMO_MODE | No | false |

## 📊 Key Features Explained

### Job Mining Pipeline

1. **Scraping Phase**: Puppeteer crawls ausbildung.de with realistic browsing patterns
2. **AI Analysis**: Gemini API extracts structured data from HTML
3. **Salary Resolution**: Multi-level priority system for salary extraction:
   - Priority 1: Scraped salary data
   - Priority 2: Description parsing
   - Priority 3: Company website lookup
   - Priority 4: Tariff standard fallback
4. **Persistence**: Data saved to MongoDB with vacancy tracking

### Rate Limiting Strategy

- API key rotation for Gemini (max 15 calls/minute per key)
- Automatic fallback to HTML parsing when rate limited
- Scraper delays (2-5 seconds) mimicking human behavior
- Company website lookups throttled to 1 request/second

### Data Quality

- Duplicate detection via original_link
- Vacancy count change tracking
- Historical data preservation (jobs marked inactive, not deleted)
- Confidence scores for enriched data
- Invalid entry filtering

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Error**
```
Error: connect ECONNREFUSED
```
Solution: Ensure MongoDB is running and MONGO_URI is correct

**Gemini API Rate Limit**
```
Error: 429 Too Many Requests
```
Solution: Add multiple API keys to GEMINI_API_KEYS (comma-separated)

**Scraper Cookie Modal Issues**
```
Cookie consent modal blocking content
```
Solution: Handled automatically; if persistent, check ausbildung.de website changes

**Port Already in Use**
```
Error: listen EADDRINUSE :::5000
```
Solution: Change PORT environment variable or kill process on port 5000

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see [LICENSE.md](./LICENSE.md) for details.

## 🙏 Acknowledgments

- Google Gemini API for AI-powered data enrichment
- Puppeteer for reliable web automation
- MongoDB for flexible data storage
- React community for excellent libraries
- All job platforms for data sources

## 📧 Support

For questions or issues:
- Create an issue on GitHub
- Check existing documentation
- Review troubleshooting guides

---

**Last Updated**: April 2026  
**Version**: 1.0.0