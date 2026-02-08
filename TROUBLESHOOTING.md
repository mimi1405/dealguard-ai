# Document Upload 502 Bad Gateway - Troubleshooting Guide

## Problem Summary

Users encounter a **502 Bad Gateway** error when uploading documents. The error manifests as:
- "Failed to load resource: the server responded with a status of 502"
- "Upload error: Error: Failed to trigger n8n"

## Root Cause

The 502 error is intentionally returned by the API endpoint (`/api/documents/process`) when the n8n webhook service is unreachable, slow, or misconfigured.

**The chain of events:**
1. User uploads PDF via browser
2. File is stored in Supabase Storage ✅
3. Document record is created in database ✅
4. API tries to trigger n8n webhook ❌ (fails here)
5. API returns 503 (displayed as 502 to user)
6. User sees error message

## Diagnostic Steps

### 1. Check N8N Service Health

Run the built-in health check endpoint:

```bash
curl https://your-app.com/api/diagnostics/n8n-health
```

Expected response:
```json
{
  "timestamp": "2026-02-08T12:00:00.000Z",
  "environment": "production",
  "urls": {
    "chunk": "configured",
    "run": "configured"
  },
  "checks": [
    {
      "name": "N8N Chunk Webhook",
      "url": "https://dealguard.app.n8n.cloud/webhook/init-chunking",
      "status": "healthy",
      "statusCode": 200,
      "responseTime": 245
    }
  ]
}
```

### 2. Verify Environment Variables

Check that `N8N_CHUNK_WEBHOOK_URL` is correctly configured:

```bash
# In your deployment environment (not in code)
echo $N8N_CHUNK_WEBHOOK_URL
# Should output: https://dealguard.app.n8n.cloud/webhook/init-chunking
```

**Common mistakes:**
- ❌ `N8N_CHUNK_WEBHOOK_URL` has typo in URL
- ❌ Environment variable not set at all
- ❌ Using test/staging URL in production
- ❌ Webhook endpoint path is incorrect

### 3. Check N8N Webhook Configuration

1. Log into n8n dashboard
2. Navigate to the webhook workflow for "init-chunking"
3. Verify:
   - ✅ Webhook is "Active"
   - ✅ Webhook URL path matches: `/webhook/init-chunking`
   - ✅ Method is set to POST
   - ✅ Request body parsing is enabled

### 4. Review API Logs

Check your server logs for detailed error information:

```
[n8n] Attempt 1/3 to trigger: https://dealguard.app.n8n.cloud/webhook/init-chunking
[n8n] Failed response: {
  "status": 404,
  "statusText": "Not Found",
  "detail": "Webhook endpoint not found"
}
```

**Common errors:**

| Status | Meaning | Solution |
|--------|---------|----------|
| 400 | Invalid payload | Check `deal_id` and `document_id` format |
| 401 | Authentication failed | N8n webhook may require API key in header |
| 404 | Endpoint not found | Verify webhook URL is correct |
| 503 | N8n service down | Check n8n cloud service status |
| 504 | Timeout | N8n is slow; increase `FETCH_TIMEOUT_MS` |

### 5. Test N8N Webhook Directly

```bash
curl -X POST https://dealguard.app.n8n.cloud/webhook/init-chunking \
  -H "Content-Type: application/json" \
  -d '{"deal_id": "test-123", "document_id": "doc-456"}'
```

Expected response:
```json
{"ok": true}
```

## Solutions

### Solution 1: Check N8N Service Status

Visit: https://status.n8n.io (if applicable to your n8n instance)

- If service is down, wait for recovery
- If running self-hosted, ensure n8n container/process is running

### Solution 2: Verify Webhook Configuration in N8N

1. In n8n, edit the "init-chunking" workflow
2. Click on the webhook node
3. Ensure:
   - Path: `/webhook/init-chunking`
   - Method: POST
   - Status: Active
4. Save and redeploy workflow

### Solution 3: Update Environment Variable

```bash
# For Vercel
vercel env add N8N_CHUNK_WEBHOOK_URL
# When prompted, paste: https://dealguard.app.n8n.cloud/webhook/init-chunking

# For other platforms
export N8N_CHUNK_WEBHOOK_URL="https://dealguard.app.n8n.cloud/webhook/init-chunking"
```

### Solution 4: Adjust Timeout

If n8n is slow, increase timeout in `/app/api/documents/process/route.ts`:

```typescript
const FETCH_TIMEOUT_MS = 60000; // Changed from 30000
```

### Solution 5: Add N8N Authentication

If your n8n webhook requires authentication:

```typescript
// In /app/api/documents/process/route.ts
const response = await fetchWithTimeout(
  n8nUrl,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.N8N_WEBHOOK_KEY}`, // Add this
    },
    body: JSON.stringify(payload),
  },
  FETCH_TIMEOUT_MS
);
```

## Understanding the Retry Logic

The API now automatically retries failed n8n calls:

- **Attempt 1**: Immediate
- **Attempt 2**: After 1 second delay (if 5xx error or timeout)
- **Attempt 3**: After 2 second delay (if 5xx error or timeout)
- **Timeout**: 30 seconds per attempt

This means total maximum wait time = 30s + (1s × 2) + (2s × 2) = ~36 seconds

## Error Messages Seen by Users

### "Invalid request to n8n (check payload format)"
- **Cause**: Payload structure is wrong
- **Fix**: Ensure `deal_id` and `document_id` are valid UUID strings

### "N8n authentication failed"
- **Cause**: Webhook requires API key
- **Fix**: Add `Authorization` header with API key

### "N8n webhook endpoint not found"
- **Cause**: URL path is incorrect
- **Fix**: Verify webhook URL in n8n dashboard

### "N8n service unavailable"
- **Cause**: N8n is down or overloaded
- **Fix**: Check n8n status, wait for recovery

### "Document processing request timed out"
- **Cause**: N8n took > 30 seconds to respond
- **Fix**: Increase timeout or check n8n performance

## Development vs Production

**Development:**
- Errors include detailed debug information
- Timeouts are shorter (good for development feedback)
- Check `/api/diagnostics/n8n-health` for health status

**Production:**
- Errors show user-friendly messages only
- Longer timeouts to accommodate network delays
- Details logged server-side only

## Prevention Measures

### 1. Monitor N8N Webhook Health

Add regular health checks:

```bash
# Monitor every 5 minutes
*/5 * * * * curl https://your-app.com/api/diagnostics/n8n-health
```

### 2. Set Up Alerts

Alert when:
- N8n webhook returns non-200 status
- Response time exceeds threshold
- Consecutive failures > 3

### 3. Implement Fallback Behavior

The system now marks documents as "uploaded" even if n8n processing fails. You can:
- Retry processing manually via API
- Queue for async processing later
- Notify administrators of stuck documents

### 4. Add Request Logging

Monitor requests to the process endpoint:

```bash
# View recent requests
tail -f /var/log/app/api.log | grep "\[process\]"
```

### 5. Keep N8N Updated

Regularly update n8n to get performance improvements and bug fixes:

```bash
npm update @n8n-io/n8n
```

## Manual Recovery

If a document is stuck in "uploaded" status:

```sql
-- View stuck documents
SELECT id, deal_id, status, created_at
FROM documents
WHERE status = 'uploaded'
AND created_at < now() - interval '1 hour';

-- Manually trigger reprocessing (if needed)
-- Update the document and retry via UI
```

## Contact & Support

If issues persist after following these steps:

1. **Check server logs** for detailed error messages
2. **Run diagnostics**: `/api/diagnostics/n8n-health`
3. **Verify n8n webhook** is properly configured
4. **Check n8n service status** for outages
5. **Review this guide** for your specific error message
