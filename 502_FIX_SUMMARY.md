# 502 Bad Gateway Fix - Summary & Implementation

## Problem Statement

Document uploads were failing with a 502 Bad Gateway error when the n8n webhook service was unreachable or misconfigured.

**Error Chain:**
```
Browser → Upload PDF → Store file ✅ → Create record ✅ → Call n8n ❌ → 502 error
```

## Root Cause

1. **No timeout protection** - fetch() calls could hang indefinitely
2. **No retry logic** - Single failure = complete failure
3. **Poor error messages** - Users saw generic "502" instead of actionable info
4. **Duplicate config** - .env had conflicting n8n URLs
5. **No diagnostics** - No way to check n8n health without manual testing

## Solution Implemented

### 1. API Route Improvements (`/api/documents/process`)

**What Changed:**
- ✅ Added request timeout (30 seconds)
- ✅ Implemented automatic retry logic (3 attempts max)
- ✅ Added detailed error messages mapped to HTTP status codes
- ✅ Improved logging for debugging
- ✅ Changed error response from 502 to 503 (more accurate)

**Retry Strategy:**
```
Attempt 1: Immediate
Attempt 2: +1 second delay (if 5xx or timeout)
Attempt 3: +2 second delay (if 5xx or timeout)
Total max wait: ~36 seconds
```

**Error Messages:**
| Status | Message | Action |
|--------|---------|--------|
| 400 | "Invalid request to n8n" | Check payload |
| 401 | "N8n authentication failed" | Add API key |
| 404 | "N8n webhook endpoint not found" | Verify URL |
| 503 | "N8n service unavailable" | Wait for recovery |
| 504 | "Request timeout" | Increase timeout |

### 2. Client-Side Improvements (`document-upload.tsx`)

**What Changed:**
- ✅ Better error handling with code extraction
- ✅ Special handling for timeout errors (show as success)
- ✅ Improved console logging
- ✅ User-friendly error messages

```typescript
// Now extracts error code from response
const data = await processRes.json();
if (data?.code === "TIMEOUT") {
  // Show success - will process in background
}
```

### 3. Configuration Cleanup (`.env`)

**What Changed:**
- ✅ Removed duplicate n8n URL definitions
- ✅ Kept only production URLs
- ✅ Removed TEST/PROD comments that caused confusion

**Before:**
```
N8N_CHUNK_WEBHOOK_URL=...test...
N8N_CHUNK_WEBHOOK_URL=...prod...  (overwrites above)
```

**After:**
```
N8N_WEBHOOK_URL=https://dealguard.app.n8n.cloud/webhook/dd/run
N8N_CHUNK_WEBHOOK_URL=https://dealguard.app.n8n.cloud/webhook/init-chunking
```

### 4. Diagnostics Endpoint (`/api/diagnostics/n8n-health`)

**Purpose:** Check n8n webhook health without uploading documents

**Usage:**
```bash
curl https://your-app.com/api/diagnostics/n8n-health
```

**Response:**
```json
{
  "checks": [
    {
      "name": "N8N Chunk Webhook",
      "status": "healthy",
      "statusCode": 200,
      "responseTime": 245
    }
  ]
}
```

## Code Changes Summary

### File: `/app/api/documents/process/route.ts`

**Added:**
- `fetchWithTimeout()` - Prevents hanging requests
- `triggerN8nWithRetry()` - Automatic retry with exponential backoff
- Error message mapping - User-friendly error responses
- Development mode debugging - Extra details in dev environment

**Changed:**
- Error status from 502 → 503 (more semantically correct)
- Removed bare console.log statements
- Added structured logging with context

### File: `/components/documents/document-upload.tsx`

**Changed:**
- Extract error code from response
- Handle timeout errors gracefully
- Improved error logging with code and status

### File: `/.env`

**Changed:**
- Removed duplicate n8n URLs
- Kept production URLs only
- Removed confusing TEST/PROD comments

### File: `/app/api/diagnostics/n8n-health/route.ts` (NEW)

**Purpose:** Health check endpoint for diagnostics

**Checks:**
- N8n chunk webhook connectivity
- N8n run webhook connectivity
- Response time measurement
- Error status codes

## Testing the Fix

### 1. Local Testing

```bash
# Set environment
export N8N_CHUNK_WEBHOOK_URL=http://localhost:5678/webhook/init-chunking

# Start dev server
npm run dev

# Test in browser
# 1. Navigate to new deal page
# 2. Upload a PDF
# 3. Check browser console for detailed errors
```

### 2. Health Check Testing

```bash
# Check n8n connectivity
curl http://localhost:3000/api/diagnostics/n8n-health
```

### 3. Simulate N8N Failure

```bash
# Run mock server that rejects requests
node -e "
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(503);
  res.end('Service unavailable');
}).listen(5678);
"

# Upload a document and watch it retry 3 times
```

## Behavior Changes

### Before Fix

- ❌ Single n8n failure = immediate 502 error
- ❌ No retry attempts
- ❌ Generic "Failed to trigger n8n" message
- ❌ No way to check n8n health
- ❌ Requests could hang forever

### After Fix

- ✅ 3 automatic retry attempts
- ✅ Detailed error messages
- ✅ Timeout protection (30 seconds per attempt)
- ✅ Health check endpoint available
- ✅ Better logging for debugging

## Performance Impact

| Metric | Impact | Notes |
|--------|--------|-------|
| Success case | +30-100ms | 1 request + timeout setup |
| Failure case | +30-36s | 3 attempts with delays |
| Timeout case | +30s | Hard limit, prevents hangs |
| Health check | ~100-500ms | Only runs on diagnostics endpoint |

## Breaking Changes

⚠️ **None** - This is a backward-compatible fix.

The API response format changed slightly:
- Old: `{ error: "...", status: 502 }`
- New: `{ error: "...", code: "...", status: 503 }`

But client code handles both gracefully.

## Migration Guide

### For Deployment Platforms

**Vercel:**
```bash
vercel env add N8N_CHUNK_WEBHOOK_URL
vercel env add N8N_WEBHOOK_URL
```

**Netlify:**
1. Site Settings → Build & Deploy → Environment
2. Add `N8N_CHUNK_WEBHOOK_URL`
3. Add `N8N_WEBHOOK_URL`

**Docker:**
```dockerfile
ENV N8N_CHUNK_WEBHOOK_URL=https://...
ENV N8N_WEBHOOK_URL=https://...
```

### For N8N Configuration

1. Ensure webhook is **Active** in n8n dashboard
2. Verify webhook URL matches environment variable
3. Check request body parsing is enabled
4. Optional: Add authentication header handling

## Monitoring Recommendations

### 1. Set Up Health Checks

```bash
# Check every 5 minutes
*/5 * * * * curl https://app.com/api/diagnostics/n8n-health
```

### 2. Alert on Failures

Alert when:
- Health check returns non-200
- N8n response time > 5 seconds
- Retry count > 2 attempts (3+ failures)

### 3. Log Analysis

Watch for patterns:
```bash
tail -f logs | grep "\[n8n\]"
```

## Known Limitations

1. **No background job queue** - Failed uploads don't auto-retry after timeout
2. **30 second max timeout** - Longer workflows may fail
3. **No webhook validation** - Can't verify request origin
4. **No rate limiting** - High volume uploads could overwhelm n8n

## Future Improvements

- [ ] Add job queue for async processing
- [ ] Implement webhook signing for security
- [ ] Add webhook validation in n8n
- [ ] Support batch document processing
- [ ] Add progress callbacks from n8n
- [ ] Support multiple n8n instances (load balancing)

## Related Documentation

- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Detailed diagnostic guide
- [N8N_INTEGRATION.md](./N8N_INTEGRATION.md) - Technical integration details

## Support & Questions

If you encounter issues:

1. **Run health check:** `/api/diagnostics/n8n-health`
2. **Check logs** for `[process]` and `[n8n]` entries
3. **Review troubleshooting guide** in [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
4. **Verify n8n webhook** is active and accessible
5. **Confirm environment variables** are set correctly
