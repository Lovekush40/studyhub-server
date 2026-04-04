import 'dotenv/config';
import { app } from './app.js';
import { connectDB } from './db/index.js';

const port = process.env.PORT || 3000;

console.log('🚀 Finalizing server configuration...');

connectDB()
  .then(() => {
    console.log('📡 Starting HTTP server...');
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`✅ StudyHub server running on http://0.0.0.0:${port}`);
    });
    
    server.on('error', (err) => {
      console.error(`❌ Server failed to start: ${err.message}`);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error(`❌ CRITICAL STARTUP ERROR: ${err.message}\n${err.stack}`);
    process.exit(1);
  });
