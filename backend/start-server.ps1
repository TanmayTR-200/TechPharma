# Kill any existing node and nodemon processes
Get-Process -Name node, nodemon -ErrorAction SilentlyContinue | ForEach-Object { 
    $_ | Stop-Process -Force
    Write-Host "Stopped process: $($_.Name) (PID: $($_.Id))"
}

# Wait for processes to fully terminate
Start-Sleep -Seconds 2

# Clear any zombie connections on port 5000
$connection = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($connection) {
    Write-Host "Found process using port 5000: $($connection.OwningProcess)"
    Stop-Process -Id $connection.OwningProcess -Force
    Start-Sleep -Seconds 1
}

# Start the server
npm run dev
