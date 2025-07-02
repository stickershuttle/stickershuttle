// Minimal Railway Test Server
console.log('🚀 Starting minimal Railway test...');

const express = require('express');
const app = express();

// Add simple middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  console.log('❤️ Health check accessed');
  res.json({ 
    status: 'minimal-test-ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 4000
  });
});

// Root endpoint
app.get('/', (req, res) => {
  console.log('🏠 Root endpoint accessed');
  res.json({ 
    message: 'Minimal Railway test server is working',
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 4000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`✅ Minimal test server running on ${HOST}:${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health: http://${HOST}:${PORT}/health`);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('✅ Minimal test server setup complete'); 