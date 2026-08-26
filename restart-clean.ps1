# Clean Restart Script for Next.js Frontend
# This script clears the build cache and restarts the dev server

Write-Host "🧹 Clearing Next.js build cache..." -ForegroundColor Yellow

# Remove .next directory
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
    Write-Host "✅ Removed .next directory" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No .next directory found" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "✨ Cache cleared! Now starting dev server..." -ForegroundColor Green
Write-Host ""

# Start the dev server
npm run dev

