// Imported first by main.ts so .env is in place before any module reads the
// environment. Local development only: apps/api/.env is never committed.
try {
  process.loadEnvFile();
} catch {
  // No .env file: use the process environment as-is.
}
