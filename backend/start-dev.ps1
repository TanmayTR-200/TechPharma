$env:PORT = 5000
$env:MONGODB_URI = "mongodb+srv://tanmaytr05:mernstack@cluster0.opmscxq.mongodb.net/techpharma?retryWrites=true&w=majority"
$env:JWT_SECRET = "your_jwt_secret"
$env:NODE_ENV = "development"

Write-Host "Starting server on port 5000..."
node src/server.js