import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ─── Apply SQLite PRAGMA optimizations ───
// Prisma's $executeRawUnsafe fails on PRAGMAs that return result rows
// (e.g., "PRAGMA journal_mode=WAL" returns {journal_mode: "wal"}).
// Solution: use $queryRawUnsafe which allows returned rows, or
// set PRAGMAs via $executeRaw inside $extends.
async function applyPragmas(client: PrismaClient) {
  const pragmas = [
    `PRAGMA journal_mode=WAL`,           // Write-Ahead Logging: concurrent reads + one write
    `PRAGMA synchronous=NORMAL`,         // Faster writes with acceptable safety
    `PRAGMA cache_size=-64000`,          // 64MB cache (negative = KB)
    `PRAGMA temp_store=MEMORY`,          // Temp tables in memory
    `PRAGMA mmap_size=268435456`,        // 256MB memory-mapped I/O
    `PRAGMA busy_timeout=5000`,          // Wait up to 5s for locked DB
  ]
  for (const pragma of pragmas) {
    try {
      // $queryRawUnsafe works for PRAGMAs that return result rows
      await client.$queryRawUnsafe(pragma)
    } catch {
      // Ignore errors — PRAGMA may already be set or not supported
    }
  }
}

// Create Prisma client with optimized settings for high traffic
function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

  // Apply SQLite performance optimizations (fire and forget)
  applyPragmas(client).catch(() => {})

  return client
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export default db

// ─── Retry helper for SQLite busy errors ───
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 200
): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: unknown) {
      lastError = error
      const errMsg = error instanceof Error ? error.message : String(error)
      // Retry on SQLITE_BUSY or SQLITE_LOCKED errors
      if (errMsg.includes('SQLITE_BUSY') || errMsg.includes('SQLITE_LOCKED') || errMsg.includes('busy')) {
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)))
          continue
        }
      }
      // Don't retry on other errors
      throw error
    }
  }
  throw lastError
}

// ─── Simple admin auth check for API routes ───
// Checks if the request includes the correct admin password header
export function isAdminRequest(req: Request): boolean {
  const authHeader = req.headers.get('x-admin-auth')
  if (!authHeader) return false
  return authHeader === '307524'
}
