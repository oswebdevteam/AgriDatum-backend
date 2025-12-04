import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import { harvestRoutes } from './routes/harvest.routes.js';
import { keysRoutes } from './routes/keys.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { pool, initializeDatabase } from './config/database.js';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    blockchain: {
      enabled: !!process.env.BLOCKFROST_PROJECT_ID,
      network: process.env.BLOCKFROST_PROJECT_ID?.startsWith('preprod') ? 'preprod' : 'mainnet'
    }
  });
});

// Routes
app.use('/api/harvest', harvestRoutes);
app.use('/api/keys', keysRoutes)

// Error handling
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');

    // Initialize database tables
    await initializeDatabase();

    // Verify blockchain configuration
    if (!process.env.BLOCKFROST_PROJECT_ID) {
      console.warn('⚠️  BLOCKFROST_PROJECT_ID not set - blockchain features disabled');
    } else {
      console.log('✅ Blockchain integration enabled');
      
      // Test blockchain service initialization
      try {
        const { blockfrostService } = await import('./services/blockfrost.service.js');
        const companyAddress = await blockfrostService.getCompanyAddress();
        console.log('✅ Company wallet initialized:', companyAddress);
        
        const balance = await blockfrostService.getWalletBalance();
        if (balance) {
          const adaBalance = parseInt(balance.amount[0]?.quantity || '0') / 1_000_000;
          console.log(`💰 Wallet balance: ${adaBalance} ADA`);
          
          if (adaBalance < 10) {
            console.warn('⚠️  Low wallet balance. Get test ADA from: https://docs.cardano.org/cardano-testnet/tools/faucet/');
          }
        }
      } catch (walletError: any) {
        console.error('❌ Blockchain initialization failed:', walletError.message);
        console.log('📝 Please check your COMPANY_WALLET_MNEMONIC in .env');
      }
    }

    if (!process.env.COMPANY_WALLET_MNEMONIC) {
      console.warn('⚠️  COMPANY_WALLET_MNEMONIC not set - blockchain submissions will fail');
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 AgriDatum backend running on port ${PORT}`);
      console.log(`📡 API endpoints:`);
      console.log(`   POST /api/harvest/submit`);
      console.log(`   POST /api/harvest/verify`);
      console.log(`   GET  /api/harvest/records/:farmerId`);
      console.log(`   GET  /api/harvest/records`);
      console.log(`   POST  /api/keys/generate`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();