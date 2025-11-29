// src/config/database.ts
import pkg from 'pg';
const { Pool } = pkg;

import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

export const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS harvest_records (
        id SERIAL PRIMARY KEY,
        farmer_id VARCHAR(64) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        plot_location TEXT NOT NULL,
        crop_type VARCHAR(50) NOT NULL,
        weight_kg DECIMAL(10,2) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        transaction_hash VARCHAR(64) UNIQUE,
        public_key VARCHAR(200) NOT NULL,
        farmer_address TEXT NOT NULL,
        signature TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        indexed_on_chain BOOLEAN DEFAULT FALSE
      );

      CREATE INDEX IF NOT EXISTS idx_farmer_id ON harvest_records(farmer_id);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON harvest_records(timestamp);
      CREATE INDEX IF NOT EXISTS idx_crop_type ON harvest_records(crop_type);
      CREATE INDEX IF NOT EXISTS idx_transaction_hash ON harvest_records(transaction_hash);
      CREATE INDEX IF NOT EXISTS idx_indexed_on_chain ON harvest_records(indexed_on_chain);
    `);
    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
};