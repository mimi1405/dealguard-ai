# Dealguard AI - Setup Instructions

Complete setup guide for deploying Dealguard AI.

## Step 1: Supabase Project Setup

### 1.1 Create Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for project to be fully provisioned
4. Note your project URL and keys

### 1.2 Database Migration

The database schema has already been applied via the Supabase MCP tool. It includes:

- ✅ `profiles` table
- ✅ `projects` table
- ✅ `documents` table
- ✅ `questionnaires` table
- ✅ `analyses` table
- ✅ All Row Level Security (RLS) policies
- ✅ Indexes and triggers

To verify, check your Supabase dashboard under "Database" → "Tables".

### 1.3 Storage Bucket Setup

**CRITICAL:** You must manually create the storage bucket and policies.

1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Name: `dealguard-docs`
4. Make it **Private** (NOT public)
5. Click "Create bucket"

### 1.4 Storage Policies

After creating the bucket, set up access policies:

1. Click on the `dealguard-docs` bucket
2. Go to "Policies" tab
3. Add the following policies:

**Policy 1: Upload Own Documents**
```sql
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dealguard-docs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 2: Read Own Documents**
```sql
CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'dealguard-docs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 3: Update Own Documents**
```sql
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dealguard-docs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 4: Delete Own Documents**
```sql
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'dealguard-docs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Step 2: MindStudio Configuration

### 2.1 Create Agent
1. Go to [MindStudio](https://mindstudio.ai)
2. Create a new agent for due diligence analysis
3. Configure the agent with:
   - Workflow name: "Master"
   - Input variables: projectMeta, questionnaire, documents
4. Train/configure as needed for due diligence tasks

### 2.2 Get Credentials
1. Go to Developer settings
2. Create an API key
3. Copy the Agent ID from your agent settings

## Step 3: Environment Variables

Create a `.env.local` file in the project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# MindStudio Configuration
MINDSTUDIO_API_KEY=your-mindstudio-api-key-here
DEALGUARD_AGENT_ID=your-agent-id-here
```

**Where to find these values:**

**Supabase:**
- Go to Project Settings → API
- `NEXT_PUBLIC_SUPABASE_URL`: "Project URL"
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: "anon public" key
- `SUPABASE_SERVICE_ROLE_KEY`: "service_role secret" key (⚠️ Keep secret!)

**MindStudio:**
- Agent ID: From agent settings page
- API Key: From developer/API settings

## Step 4: Install and Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The app will be available at `http://localhost:3000`

## Step 5: Test the Application

### 5.1 Test Authentication
1. Go to http://localhost:3000
2. Click "Get Started"
3. Create an account
4. Verify you're redirected to /app dashboard

### 5.2 Test Project Creation
1. Click "New Project"
2. Fill in all required fields
3. Submit and verify redirect to project page

### 5.3 Test Document Upload
1. Open a project
2. Go to "Documents" tab
3. Select a category
4. Upload a PDF file
5. Verify extraction status changes:
   - "Pending" → "Extracting" → "Text Ready"
6. Check Supabase Storage to verify files were uploaded

### 5.4 Test Questionnaire
1. Go to "Questionnaire" tab
2. Fill in investment thesis
3. Select focus areas
4. Add key risks
5. Save questionnaire

### 5.5 Test AI Analysis
1. Ensure you have:
   - ✅ Completed project metadata
   - ✅ Uploaded documents with "Text Ready" status
   - ✅ Completed questionnaire
2. Go to "Analysis" tab
3. Click "Start Analysis"
4. Verify status changes to "Running"
5. Wait for completion (or check status endpoint)

## Step 6: Production Deployment

### 6.1 Build Check
```bash
npm run build
```

Ensure build completes without errors.

### 6.2 Environment Variables
Set all environment variables in your hosting platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables
- Other: Follow platform-specific instructions

### 6.3 Deploy
```bash
# For Vercel
vercel

# For Netlify
netlify deploy --prod
```

## Troubleshooting

### Issue: "Module not found: @supabase/ssr"
**Solution:** Run `npm install @supabase/ssr`

### Issue: "Storage bucket not found"
**Solution:** Create the `dealguard-docs` bucket in Supabase Storage

### Issue: "Permission denied" when uploading
**Solution:** Check storage policies are correctly set up

### Issue: "Text extraction failed"
**Solution:**
- Verify PDF is not corrupted
- Check if PDF is scanned (no selectable text)
- Check browser console for detailed error

### Issue: "Analysis trigger failed"
**Solution:**
- Verify MindStudio API key is correct
- Check Agent ID is correct
- Verify documents have extracted text
- Check server logs for detailed error

### Issue: Authentication redirect loop
**Solution:**
- Clear browser cookies/cache
- Check Supabase project is not paused
- Verify environment variables are set

## Security Notes

⚠️ **NEVER commit `.env.local` to git**
- Already in `.gitignore`
- Use example file (`.env.local.example`) for reference

⚠️ **Service Role Key Security**
- Only use in server-side code
- Never expose to client
- Rotates keys if compromised

⚠️ **Row Level Security**
- All tables have RLS enabled
- Users can only access their own data
- Test with multiple accounts

## Support

For issues or questions:
1. Check this documentation
2. Review error logs in browser console
3. Check Supabase logs
4. Review MindStudio API documentation

## Next Steps

After successful setup:
1. Customize the landing page
2. Add your brand logo
3. Configure email templates in Supabase
4. Set up error tracking (Sentry, etc.)
5. Add analytics
6. Configure custom domain
7. Set up backup strategy
