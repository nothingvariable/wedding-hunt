import { query } from './client'

let migrationPromise: Promise<void> | null = null

export async function runMigrations(): Promise<void> {
  if (migrationPromise) return migrationPromise

  migrationPromise = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS participants (
        id            SERIAL PRIMARY KEY,
        name          VARCHAR(100) NOT NULL,
        team          VARCHAR(10) NOT NULL CHECK (team IN ('bride', 'groom')),
        session_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await query(`
      CREATE TABLE IF NOT EXISTS completions (
        id              SERIAL PRIMARY KEY,
        participant_id  INTEGER REFERENCES participants(id) ON DELETE CASCADE,
        item_key        VARCHAR(100) NOT NULL,
        photo_filename  VARCHAR(255),
        bonus_awarded   BOOLEAN DEFAULT FALSE,
        completed_at    TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(participant_id, item_key)
      )
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_completions_participant ON completions(participant_id)
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_participants_team ON participants(team)
    `)
  })()

  return migrationPromise
}
