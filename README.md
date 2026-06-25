# Idempotency-Gateway (The "Pay-Once" Protocol)
> A "Pay-Once" API layer that ensures payment requests are processed exactly once, no matter how many times they are retried.

---

## 1. Architecture Diagram

![Sequence Diagram](./docs/Sequence_Diagram.png)

### Components

- **Client** — The external system (e.g. an e-commerce store) sending payment requests.

- **Middleware** — The idempotency layer. Every request passes through here first. It checks for the `Idempotency-Key` header, queries the store for its status, and decides whether to process, replay, or reject the request.

- **Controller** — Handles the actual payment logic. Validates the request body with Zod, simulates payment processing, and updates the store with the final response.

- **Store (Memory | Redis)** — Persists idempotency records keyed by `Idempotency-Key`. Each record holds the payment status (`PENDING` or `COMPLETED`), a hash of the request body, and the cached response. Defaults to in-memory in development and Redis in production.

### Flow Summary

A new request hits the middleware. If the key is missing, it's rejected immediately. If the key exists and is `COMPLETED`, the cached response is replayed — unless the request body has changed, in which case it's rejected as a conflict. If the key is `PENDING` (in-flight), the request polls the store until the original completes. If the key is brand new, it's registered as `PENDING` and forwarded to the controller for processing.


## 2. Setup Instructions

**Requirements:**
- Node.js v18+
- Redis (optional — only required when `NODE_ENV=production`). Use a local instance or a cloud provider like [Redis Cloud](https://redis.io/cloud/) or [Upstash](https://upstash.com/).

```bash
# 1. Clone the repository
git clone https://github.com/sarf01k/Idempotency-Gateway.git
cd Idempotency-Gateway

# 2. Install dependencies
npm install

# 3. Create a .env file
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
NODE_ENV=development
TTL_SECONDS=86400
REDIS_URL=redis://localhost:6379
```

```bash
# 4. Start the server
npm run dev    # development — uses tsx, hot reload
npm start      # production — compiles to JS first, then runs
```

> The store is determined by `NODE_ENV`. Set to `development` for in-memory, `production` for Redis. `REDIS_URL` is only required when using Redis.

## 3. API Documentation

### `POST /process-payment`

Processes a payment request. Guaranteed to charge exactly once per unique `Idempotency-Key`.

**Headers**

| Header | Required | Description |
|---|---|---|
| `Idempotency-Key` | Yes | Unique key per request (e.g. a UUID) |
| `Content-Type` | Yes | `application/json` |

**Request Body**

```json
{
  "amount": 100,
  "currency": "GHS"
}
```

**Responses**

| Status | Description |
|---|---|
| `200 OK` | Payment processed successfully |
| `200 OK` + `X-Cache-Hit: true` | Duplicate request — cached response returned |
| `400 Bad Request` | Missing `Idempotency-Key` header or invalid request body |
| `409 Conflict` | Key reused with a different request body |
| `409 Conflict` | In-flight request timed out |
| `500 Internal Server Error` | Unexpected server error |

**Example Request**

```bash
curl -X POST http://localhost:3000/process-payment \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  -d '{"amount": 100, "currency": "GHS"}'
```

**Example Response**

```json
{
  "message": "Charged 100 GHS"
}
```

---

### `GET /health`

Returns the current server status.

**Example Response**

```json
{
  "status": "OK",
  "timestamp": "2026-06-22T13:31:48.000Z",
  "uptime": "120 seconds"
}
```

## 4. Design Decisions

**Zod for request validation** — Rather than manually checking each field and writing individual error responses, Zod validates the entire request body in one pass and returns structured field-level errors automatically. This keeps the controller clean and consistent.

**Polling for in-flight requests** — When a duplicate request arrives while the original is still processing (`PENDING`), the server polls the store every second for up to 10 seconds rather than immediately returning a `409`. This avoids false conflict errors under normal network retry conditions.

**Dual-store architecture** — The store is abstracted behind a shared interface, allowing the app to swap between an in-memory `Map` (development) and Redis (production) purely via `NODE_ENV`. No application code changes required.

**TTL on records** — Every idempotency record is stored with an expiry (`TTL_SECONDS`, default 24 hours). The memory store checks expiry on read and cleans up hourly. Redis handles expiry automatically via its native `EX` option.

**Request body comparison** — Instead of hashing, incoming request bodies are compared directly against the stored payload string. Simple and sufficient for a fixed schema like `{ amount, currency }`.

## 5. The Developer's Choice

### Audit Logging + ISO 4217 Currency Validation

**Audit Logging**

Every significant payment event is written to a dedicated `logs/audit.log` file, separate from general application logs. This gives a clean, chronological trail of what happened to every request:

```json
{ "event": "RECEIVED", "details": { "requestId": "f47ac10b", "idempotencyKey": "payment-001", "payload": { "amount": 100, "currency": "GHS" } } }
{ "event": "PROCESSING_STARTED", "details": { "requestId": "f47ac10b", "idempotencyKey": "payment-001" } }
{ "event": "COMPLETED", "details": { "requestId": "f47ac10b", "idempotencyKey": "payment-001", "transactionId": "txn_3a9f1c2d" } }
```

In a real fintech system, audit logs are essential for compliance, dispute resolution, and fraud investigation.

**ISO 4217 Currency Validation**

The `currency` field is validated against the full ISO 4217 currency list sourced from the [Square API](https://developer.squareup.com/reference/square/enums/Currency). Requests with invalid or unsupported currencies are rejected at the validation layer before any processing occurs — preventing bad data from ever reaching the payment logic.

```json
{
  "error": {
    "currency": ["Invalid currency"]
  }
}
```

This is a common real-world requirement in payment systems where passing an unsupported currency to a downstream processor can cause hard-to-debug failures.
