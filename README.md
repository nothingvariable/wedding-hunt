# Wedding Hunt

A mobile-first scavenger hunt app for Treefort Music Fest. Teams compete to complete photo challenges and earn points.

## Setup

### Prerequisites
- Node.js 20+
- PostgreSQL database

### Local Development

1. Copy the env example:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your `DATABASE_URL` in `.env.local`.

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run the dev server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

The database tables are created automatically on first request.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | required | PostgreSQL connection string |
| `PHOTO_DIR` | `/data/photos` | Directory for uploaded photos |
| `MAX_UPLOAD_SIZE` | `10485760` | Max upload size in bytes (10MB) |

## Deploy on Railway

1. Create a new Railway project.
2. Add a PostgreSQL service.
3. Add a web service pointing to this repo.
4. Set `DATABASE_URL` to the Railway Postgres connection string.
5. Optionally set `PHOTO_DIR` to a persistent volume path.

Railway will build using the Dockerfile automatically.

## How It Works

- Join screen: enter your name, pick Team Bride or Team Groom.
- Hunt checklist: 41 items grouped by category. Upload photos or self-check video items.
- Leaderboard: see team and individual scores, auto-refreshes every 30 seconds.
