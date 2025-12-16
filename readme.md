# Async Image Processing Service

A production-ready asynchronous image processing service built with Node.js, TypeScript, and Redis-backed job queues.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js + TypeScript** | Runtime & type safety |
| **Express** | HTTP API server |
| **BullMQ** | Job queue with concurrency control |
| **Redis** | Persistent job storage |
| **Sharp** | High-performance image processing |
| **Multer** | File upload handling |
| **Swagger** | API documentation |

## Requirements

- **Node.js** >= 18
- **Redis** server running (default: `localhost:6379`)
- **npm** or yarn

## Installation

```bash
# Install dependencies
npm install

# Create .env file (optional)
echo "REDIS_HOST=localhost" > .env
echo "REDIS_PORT=6379" >> .env
echo "REDIS_PASSWORD=" >> .env
```

## Running the Service

You need **two separate terminals** - one for the API and one for the worker:

```bash
# Terminal 1: Start the API server
npm run dev

# Terminal 2: Start the worker process
npm run worker
```

**Production mode:**
```bash
npm run build
npm run start        # API
npm run worker:prod  # Worker
```

## API Endpoints

### POST `/process-images`
Upload one or more images for async processing.

**Request:** `multipart/form-data` with `images` field (max 10 files, 5MB each)

**Response:** `202 Accepted`
```json
{
  "batchId": "550e8400-e29b-41d4-a716-446655440000",
  "statusUrl": "/batches/550e8400-e29b-41d4-a716-446655440000",
  "totalFiles": 3
}
```

---

### GET `/batches/:batchId`
Get status of all files in a batch.

**Response:**
```json
{
  "batchId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": {
    "total": 3,
    "completed": 3,
    "failed": 0,
    "active": 0,
    "waiting": 0
  },
  "createdAt": "2024-12-16T06:00:00.000Z",
  "files": [
    {
      "jobId": "1",
      "originalName": "photo1.jpg",
      "state": "completed",
      "result": { "originalName": "photo1.jpg", "outputPath": "processed/processed-abc123.jpg" },
      "failedReason": null
    }
  ]
}
```

**Batch Status Values:**
- `waiting` - All files waiting to be processed
- `processing` - At least one file is being processed
- `completed` - All files processed successfully
- `completed-with-errors` - Processing done but some files failed

---

### GET `/jobs/:jobId`
Get status of a single file/job.

**Response:**
```json
{
  "jobId": "1",
  "state": "completed",
  "progress": 0,
  "result": { "originalName": "photo1.jpg", "outputPath": "processed/processed-abc123.jpg" },
  "failedReason": null
}
```

**Job States:** `waiting` → `active` → `completed` or `failed`

---

### Swagger Docs
Interactive API documentation: **http://localhost:3000/docs**

## How It Works

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌────────────┐
│  Client │────▶│  Express API │────▶│ Redis Queue │────▶│   Worker   │
└─────────┘     └─────────────┘     └─────────────┘     └────────────┘
                      │                    │                   │
                  202 Accepted        Stores batch         Processes
                  + batchId           + job data           concurrently
                      │                    │                   │
                      ▼                    ▼                   ▼
              ┌──────────────┐     ┌─────────────┐    ┌──────────────┐
              │ GET /batches │◀────│ Job status  │◀───│  Processed   │
              │ for status   │     │   updates   │    │   Images     │
              └──────────────┘     └─────────────┘    └──────────────┘
```

1. **Client uploads images** → API queues each file as a separate job
2. **API returns `202 Accepted`** with `batchId` → No blocking
3. **Worker processes jobs concurrently** (up to CPU cores - 1)
4. **Sharp transforms images** → Resize, grayscale, JPEG compress
5. **Client polls batch status** → Get all results when completed

## Image Processing Pipeline

Each uploaded image goes through:

1. **Resize** to 512px width (maintains aspect ratio)
2. **Grayscale** conversion
3. **JPEG compression** at 80% quality
4. **Save** to `processed/` directory

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis server host |
| `REDIS_PORT` | `6379` | Redis server port |
| `REDIS_PASSWORD` | *(empty)* | Redis auth password |

## Why This Architecture?

### Problem
- Image processing is CPU-intensive
- Node.js is single-threaded
- Synchronous processing blocks the event loop
- Heavy load causes timeouts and crashes

### Solution
- **Decoupled processing** → API never blocks
- **Job queue** → Absorbs traffic spikes
- **Concurrency limits** → Prevents CPU overload (based on CPU cores)
- **Batch tracking** → One ID to track multiple files
- **Separate worker** → Crashes don't affect API