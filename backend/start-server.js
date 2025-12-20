const { execSync } = require('child_process');
const { resolve } = require('path');
const { config } = require('dotenv');

// Load environment variables
config({ path: resolve(__dirname, '.env') });

// Fixed environment variables
process.env.PORT = '5000'; // Using fixed port 5000
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/techpharma';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

console.log('Starting server with configuration:');
console.log('- PORT:', process.env.PORT);
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');

// Kill existing Node.js processes on the specified port
const port = process.env.PORT;
console.log('Cleaning up port', port);

try {
    if (process.platform === 'win32') {
        execSync(`for /f "tokens=5" %a in ('netstat -aon ^| find ":${port}" ^| find "LISTENING"') do taskkill /f /pid %a`, { stdio: 'ignore' });
    } else {
        execSync(`lsof -i:${port} -t | xargs kill -9`, { stdio: 'ignore' });
    }
} catch (err) {
    // Ignore errors if no processes were found
}

// Wait a moment for processes to clean up
setTimeout(() => {
    try {
        console.log('Starting server...');
        require('./src/server.js');
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}, 2000);
