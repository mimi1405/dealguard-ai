# Dealguard AI - AI-Driven Due Diligence Platform

A production-ready SaaS platform for AI-powered due diligence analysis. Built with Next.js, TypeScript, Supabase, and MindStudio AI.

## Architecture Overview

### Tech Stack

**Frontend:**
- Next.js 13 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Dark theme by default

**Backend:**
- Supabase (Authentication, PostgreSQL, Storage)
- Row Level Security (RLS)
- Server-side API routes

**AI Integration:**
- MindStudio AI API v2
- Server-side only (API keys never exposed to client)

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── documents/extract/    # PDF text extraction
│   │   └── analysis/
│   │       ├── trigger/           # Start MindStudio analysis
│   │       └── status/            # Poll analysis status
│   ├── app/                       # Protected routes
│   │   ├── layout.tsx             # App shell with sidebar
│   │   ├── page.tsx               # Dashboard
│   │   └── projects/
│   │       ├── page.tsx           # Projects list
│   │       ├── new/               # Create project
│   │       └── [id]/              # Project detail with tabs
│   ├── login/                     # Login page
│   ├── signup/                    # Signup page
│   └── page.tsx                   # Landing page
├── components/
│   ├── ui/                        # shadcn/ui components
│   └── project/                   # Project-specific components
│       ├── ProjectMeta.tsx
│       ├── ProjectDocuments.tsx
│       ├── ProjectQuestionnaire.tsx
│       └── ProjectAnalysis.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser client
│   │   └── server.ts              # Server client
│   └── types/
│       └── database.ts            # TypeScript types
└── middleware.ts                  # Auth middleware
```

## Database Schema

The system is built around **4 core layers**:

### 1. Projects (Stammdaten)
- Project metadata (name, client, type, industry, jurisdiction)
- Confidentiality levels
- Transaction details
- Analysis goals

### 2. Documents
- PDF-only uploads
- Automatic text extraction using pdfjs-dist
- Text stored separately for AI analysis
- Chunking for large files (>10MB)
- Status tracking (pending → extracting → done/error)

### 3. Questionnaires
- Investment thesis
- Focus areas (Financials, Legal, Market, Team, Technology, Operations)
- Key risks with severity levels
- Red flags
- Special AI instructions

### 4. Analyses
- Analysis status (not_started → running → completed/failed)
- MindStudio run ID
- Result JSON (read-only)
- Error handling

## Environment Setup

### Required Environment Variables

Create `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# MindStudio Configuration
MINDSTUDIO_API_KEY=your-mindstudio-api-key
DEALGUARD_AGENT_ID=your-dealguard-agent-id
```

### Supabase Setup

1. **Create a new Supabase project**

2. **Apply database migration:**
   The migration file has already been applied and includes:
   - All tables (profiles, projects, documents, questionnaires, analyses)
   - Row Level Security policies
   - Indexes for performance
   - Automatic timestamp triggers

3. **Create storage bucket:**
   ```sql
   -- Create private bucket for documents
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('dealguard-docs', 'dealguard-docs', false);

   -- Set up storage policies
   CREATE POLICY "Users can upload own documents"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'dealguard-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

   CREATE POLICY "Users can read own documents"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'dealguard-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

### MindStudio Setup

1. Create a MindStudio agent for due diligence analysis
2. Copy the Agent ID
3. Generate an API key from MindStudio Developer Portal
4. Add to environment variables

## Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Features

### Authentication
- Email/password authentication via Supabase
- Protected routes with middleware
- Automatic redirects based on auth state
- Profile management

### Project Management
- Create projects with detailed metadata
- Project type selection (Startup Equity, M&A, Real Estate, etc.)
- Confidentiality levels
- Transaction volume tracking

### Document Handling
- PDF-only uploads (enforced at UI and backend)
- Drag & drop interface
- Automatic text extraction using pdfjs-dist
- Real-time extraction status
- Error handling for scanned PDFs
- Text chunking for large files
- Private storage in Supabase

### Questionnaire
- Dynamic form with validation
- Multi-select focus areas
- Risk management with severity levels
- Conditional fields (red flags)
- Special AI instructions

### AI Analysis
- Server-side MindStudio integration
- Secure API key handling
- Status tracking and polling
- Result visualization
- Error handling and retry logic

## API Routes

### POST /api/documents/extract
Extracts text from uploaded PDF using pdfjs-dist
- Validates document ownership
- Extracts text from all pages
- Handles scanned PDFs (OCR warning)
- Chunks large text files
- Updates document status

### POST /api/analysis/trigger
Triggers MindStudio analysis
- Validates project ownership
- Checks for questionnaire completion
- Verifies document text extraction
- Creates signed URLs for text artifacts
- Calls MindStudio API
- Returns run ID

### GET /api/analysis/status?runId=xxx
Polls MindStudio for analysis status
- Checks local database first
- Polls MindStudio API if running
- Updates local status on completion
- Stores results

## Security

### Row Level Security (RLS)
All tables have RLS policies ensuring:
- Users can only access their own data
- owner_id is automatically set to auth.uid()
- No data leakage between users

### Authentication
- Protected routes via middleware
- Session management with Supabase
- Automatic token refresh

### API Keys
- Server-side only
- Never exposed to client
- Environment variable based

## Color Palette

The app uses a custom dark theme:
- Background: `#102030` (hsl: 210 50% 12%)
- Primary: `#3080D0` (hsl: 207 61% 51%)
- Accent: `#30B0E0` (hsl: 192 58% 53%)
- Text: `#F0F0F0` (hsl: 0 0% 94%)

## Development Notes

### PDF Text Extraction
- Uses pdfjs-dist library
- Extracts text from all pages
- Handles large files with chunking
- Detects scanned PDFs (minimal text)

### MindStudio Integration
- Text-only artifacts sent to AI
- PDFs never sent to MindStudio
- Signed URLs for secure access
- 1-hour expiration on URLs

### Storage Structure
```
dealguard-docs/
  {userId}/
    {projectId}/
      {documentId}/
        original.pdf
        extracted.txt (or extracted_part_1.txt, etc.)
```

## Production Checklist

- [ ] Set up Supabase project
- [ ] Apply database migrations
- [ ] Create storage bucket with policies
- [ ] Configure environment variables
- [ ] Set up MindStudio agent
- [ ] Test authentication flow
- [ ] Test document upload and extraction
- [ ] Test analysis trigger
- [ ] Configure production domain
- [ ] Set up monitoring and error tracking

## License

Proprietary - All rights reserved
