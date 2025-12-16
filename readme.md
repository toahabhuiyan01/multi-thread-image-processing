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

**Job States:** `waiting` → `active` → `completed` or `failed`

### Swagger Docs
Interactive API documentation available at: **http://localhost:3000/docs**

## How It Works

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌────────────┐
│  Client │────▶│  Express API │────▶│ Redis Queue │────▶│   Worker   │
└─────────┘     └─────────────┘     └─────────────┘     └────────────┘
                      │                                        │
                      │ 202 Accepted                          │
                      │ + jobId                               ▼
                      │                              ┌────────────────┐
                      │                              │ Sharp (resize, │
                      │                              │ grayscale,     │
                      │                              │ compress)      │
                      │                              └────────────────┘
                      │                                        │
                      ▼                                        ▼
              ┌──────────────┐                        ┌──────────────┐
              │ GET /jobs/id │◀───────────────────────│  Processed   │
              │ for status   │                        │   Images     │
              └──────────────┘                        └──────────────┘
```

1. **Client uploads images** → API accepts and queues job immediately
2. **API returns `202 Accepted`** with `jobId` → No blocking
3. **Worker picks up job** from Redis queue
4. **Sharp processes images** → Resize (512px), grayscale, JPEG compress
5. **Client polls status** → Get result when completed

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
| `REDIS_PASSWORD` | (empty) | Redis auth password |

## Why This Architecture?

### Problem
- Image processing is CPU-intensive
- Node.js is single-threaded
- Synchronous processing blocks the event loop
- Heavy load causes timeouts and crashes

### Solution
- **Decoupled processing** → API never blocks
- **Job queue** → Absorbs traffic spikes
- **Concurrency limits** → Prevents CPU overload
- **Separate worker** → Crashes don't affect API