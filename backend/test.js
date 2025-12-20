const http = require('http');

const testServer = () => {
  console.log('Testing server on port 5000...');

  http.get('http://localhost:5000/health', (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Server response:', data);
    });
  }).on('error', (err) => {
    console.error('Error testing server:', err.message);
  });
};

testServer();