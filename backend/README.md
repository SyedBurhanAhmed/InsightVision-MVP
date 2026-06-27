# InsightVision API

Node.js + Express + MongoDB backend for the Flutter app.

## Prerequisites

- [MongoDB](https://www.mongodb.com/) running locally (default port `27017`)
- [Node.js](https://nodejs.org/) 18+

## Setup

```bash
cd backend
npm install
npm run seed
npm start
```

API runs at `http://localhost:3000`.

Health check: `http://localhost:3000/health`

## Demo account (after seed)

| Field    | Value                    |
|----------|--------------------------|
| Email    | `demo@insightvision.ai`  |
| Password | `demo123`                |

## Environment

Copy `.env.example` to `.env` if needed. Defaults:

- `PORT=3000`
- `MONGODB_URI=mongodb://127.0.0.1:27017/insightvision`

## API routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Server status |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Sign in |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/detections` | Yes | History sessions |
| GET | `/api/queries` | Yes | VLM query log |
| GET | `/api/analytics/summary` | Yes | Dashboard stats |

Authorization header: `Bearer <token>`
