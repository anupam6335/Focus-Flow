const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());
app.use(express.static(__dirname));

// Test route - this should definitely work
app.get('/health', (req, res) => {
  console.log('Health check called');
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// API test route
app.get('/api/test', (req, res) => {
  console.log('API test called');
  res.json({ 
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// Catch-all for SPA
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.listen(PORT, () => {
  console.log('=== SERVER STARTED ===');
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Current directory: ${__dirname}`);
  console.log('========================');
});
