# N8N Integration - Technical Details

## Overview

The document upload pipeline integrates with n8n workflow automation to handle document chunking and processing. When a user uploads a PDF:

1. **Client** → File stored in Supabase Storage
2. **Client** → Document metadata saved to database
3. **Client** → API endpoint triggered to begin processing
4. **API** → N8N webhook called to start chunking workflow
5. **N8N** → Extracts text, chunks PDF, stores results

## Architecture

```
┌─────────────────┐
│   Browser       │
│ Upload PDF      │
└────────┬────────┘
         │
         ├─→ POST /api/documents/upload
         │   (Handled by document-upload.tsx)
         │
         ├─→ Store in Supabase Storage
         │   ✅ Success
         │
         ├─→ Create document record
         │   ✅ Success
         │
         └─→ POST /api/documents/process
             │
             ├─→ Validate document
             │   ✅ Belongs to deal
             │
             ├─→ Fetch N8N_CHUNK_WEBHOOK_URL
             │   from environment
             │
             └─→ POST to N8N webhook
                 (with retry logic)
                 │
                 ├─→ Attempt 1 (immediate)
                 ├─→ Attempt 2 (after 1s)
                 ├─→ Attempt 3 (after 2s)
                 │
                 ├─→ Success (200) → Return 200 to client
                 │
                 └─→ Failure → Return 503 with error details
```

## Configuration

### Environment Variables

```bash
# .env file
N8N_WEBHOOK_URL=https://dealguard.app.n8n.cloud/webhook/dd/run
N8N_CHUNK_WEBHOOK_URL=https://dealguard.app.n8n.cloud/webhook/init-chunking
```

**Never commit these to version control** - store in your deployment platform's secrets management.

### Platform-Specific Setup

**Vercel:**
```bash
vercel env add N8N_CHUNK_WEBHOOK_URL
vercel env add N8N_WEBHOOK_URL
```

**Netlify:**
```bash
# In Site Settings → Build & Deploy → Environment
Add N8N_CHUNK_WEBHOOK_URL
Add N8N_WEBHOOK_URL
```

**Docker:**
```dockerfile
ENV N8N_CHUNK_WEBHOOK_URL=https://dealguard.app.n8n.cloud/webhook/init-chunking
ENV N8N_WEBHOOK_URL=https://dealguard.app.n8n.cloud/webhook/dd/run
```

## API Endpoints

### POST /api/documents/process

Triggers n8n document processing workflow.

**Request:**
```json
{
  "deal_id": "550e8400-e29b-41d4-a716-446655440000",
  "document_id": "660e8400-e29b-41d4-a716-446655440111"
}
```

**Success Response (200):**
```json
{
  "ok": true,
  "message": "Document processing initiated"
}
```

**Error Response (503):**
```json
{
  "error": "N8n webhook endpoint not found (check URL)",
  "code": "N8N_TRIGGER_FAILED",
  "status": 404
}
```

### GET /api/diagnostics/n8n-health

Health check endpoint for debugging n8n connectivity.

**Response:**
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

## Request Format

### N8N Expects

The `/api/documents/process` endpoint sends this payload to n8n:

```json
{
  "deal_id": "550e8400-e29b-41d4-a716-446655440000",
  "document_id": "660e8400-e29b-41d4-a716-446655440111"
}
```

**N8N workflow must:**
1. Accept POST requests
2. Parse `deal_id` and `document_id` from request body
3. Locate the document in Supabase Storage
4. Extract text from PDF
5. Create chunks in the `chunks` table with:
   - `id`: UUID
   - `deal_id`: From request
   - `document_id`: From request
   - `chunk_index`: Sequential number
   - `text`: Chunk content
   - `token_estimate`: Optional token count

## Error Handling

### Client-Side (document-upload.tsx)

```typescript
if (!processRes.ok) {
  let msg = "Failed to start document processing";
  try {
    const data = await processRes.json();
    if (data?.error) msg = data.error;
  } catch {}

  if (data?.code === "TIMEOUT") {
    msg = "Background processing started";
  }

  throw new Error(msg);
}
```

### Server-Side Retry Logic (route.ts)

```typescript
const MAX_RETRIES = 3;
const FETCH_TIMEOUT_MS = 30000;

// Automatically retries on:
// - 5xx server errors
// - Timeout/network errors
// - Does NOT retry on 4xx client errors
```

### User-Facing Error Messages

| Error | Meaning | Action |
|-------|---------|--------|
| "Invalid request to n8n" | Payload format wrong | Check deal/document IDs |
| "N8n authentication failed" | Missing/wrong auth | Add API key to header |
| "N8n webhook endpoint not found" | Wrong URL | Verify webhook path |
| "N8n service unavailable" | Service down | Wait and retry |
| "Document processing request timed out" | N8n too slow | Increase timeout |

## Development Workflow

### Testing N8N Integration Locally

1. **Start n8n locally:**
   ```bash
   npx n8n
   ```

2. **Create webhook workflow:**
   - New workflow → HTTP node
   - Set method: POST
   - Set path: `/webhook/init-chunking`
   - Add logging node
   - Deploy

3. **Set local environment:**
   ```bash
   export N8N_CHUNK_WEBHOOK_URL=http://localhost:5678/webhook/init-chunking
   ```

4. **Test via curl:**
   ```bash
   curl -X POST http://localhost:5678/webhook/init-chunking \
     -H "Content-Type: application/json" \
     -d '{"deal_id": "test-123", "document_id": "doc-456"}'
   ```

### Testing with Mock N8N

If you don't have n8n running, use a mock endpoint:

```bash
# Terminal 1: Start mock server
node -e "
const http = require('http');
http.createServer((req, res) => {
  console.log('Mock N8N received:', req.url);
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({ok: true}));
}).listen(5678);
console.log('Mock N8N running on http://localhost:5678');
"

# Terminal 2: Set environment
export N8N_CHUNK_WEBHOOK_URL=http://localhost:5678/webhook/init-chunking
npm run dev
```

## Monitoring & Observability

### Log Locations

**Server logs:**
```
[process] Triggering n8n chunking
[n8n] Attempt 1/3 to trigger
[n8n] Attempt 2/3 to trigger
[n8n] Failed response: {status: 404}
[process] Error: Failed to trigger n8n
```

**Browser console:**
```
[upload] Processing failed: {status: 503, code: "N8N_TRIGGER_FAILED"}
Upload error: Error: N8n webhook endpoint not found
```

### Metrics to Track

1. **Request success rate** - % of n8n triggers that succeed
2. **Response time** - How long n8n takes to respond
3. **Retry count** - How many retries are needed
4. **Timeout rate** - % of requests hitting timeout
5. **Document processing latency** - Time from upload to chunks created

### Setting Up Monitoring

```bash
# Example: Monitor logs with grep
tail -f server.log | grep "\[n8n\]"

# Example: Check health regularly
watch -n 5 'curl -s http://localhost:3000/api/diagnostics/n8n-health | jq'
```

## Performance Optimization

### Reduce Timeout for Faster Feedback

```typescript
const FETCH_TIMEOUT_MS = 15000; // Faster user feedback
```

### Increase Timeout for Reliability

```typescript
const FETCH_TIMEOUT_MS = 60000; // More retries, slower feedback
```

### Adjust Retry Strategy

```typescript
const MAX_RETRIES = 5; // More attempts
const RETRY_DELAY_MS = 500; // Faster retries
```

## Security Considerations

### 1. Validate Webhook Source

In n8n workflow, verify the request is from your app:

```javascript
// In N8N workflow
if ($request.headers['user-agent'] !== 'DealGuard/1.0') {
  throw new Error('Invalid source');
}
```

### 2. Rate Limiting

Implement rate limiting in n8n or at your infrastructure:

```bash
# nginx example
limit_req_zone $binary_remote_addr zone=webhook:10m rate=10r/s;
location /webhook {
  limit_req zone=webhook burst=20;
}
```

### 3. Timeout Protection

Don't let n8n requests hang forever:

```typescript
const FETCH_TIMEOUT_MS = 30000; // 30 second hard timeout
```

### 4. Input Validation

Always validate IDs are valid UUIDs:

```typescript
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(deal_id)) {
  throw new Error('Invalid deal_id format');
}
```

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed diagnostic steps.

## Future Improvements

- [ ] Webhook signing for security
- [ ] Async processing with job queue
- [ ] Batch document processing
- [ ] Progress webhook callbacks from n8n
- [ ] Document processing status polling
- [ ] Alternative chunking strategies
- [ ] OCR support for scanned PDFs
