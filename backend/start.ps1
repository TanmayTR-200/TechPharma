# Kill any existing Node.js processes that might be running
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object { $_.Kill() }

# Wait a moment for processes to close
Start-Sleep -Seconds 2

# Start the server
Write-Host "Starting backend server..."
Write-Host "Note: Running in memory-only mode (changes will not persist)"
node server.js