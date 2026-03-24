import { NextResponse } from 'next/server'
import { runMigrations } from '@/db/migrate'
import { ALL_ITEMS } from '@/lib/scores'

export async function GET() {
  await runMigrations()
  return NextResponse.json(ALL_ITEMS)
}
