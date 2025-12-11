import type { Request, Response } from 'express';
import { pool } from '../config/database.js';
import { blockfrostService } from '../services/blockfrost.service.js';
import { cryptoService } from '../services/crypto.service.js';

export class HarvestController {
  static async submitHarvest(req: Request, res: Response) {
    const client = await pool.connect();
    
    try {
      const {
        farmerId,
        phoneNumber,
        plotLocation,
        cropType,
        weightKg,
        timestamp,
        publicKey,
        signature,
      } = req.body;

      if (!farmerId || !phoneNumber || !plotLocation || !cropType || !weightKg || !timestamp || !publicKey) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['farmerId', 'phoneNumber', 'plotLocation', 'cropType', 'weightKg', 'timestamp', 'publicKey'],
        });
      }

      if (!cryptoService.isValidPublicKey(publicKey)) {
        return res.status(400).json({ error: 'Invalid public key format' });
      }

      if (signature) {
        const harvestData = {
          farmerId,
          phoneNumber,
          plotLocation,
          cropType,
          weightKg: parseFloat(weightKg),
          timestamp,
        };

        const isValid = cryptoService.verifySignature(
          harvestData,
          signature,
          publicKey
        );

        if (!isValid) {
          return res.status(400).json({ error: 'Invalid signature' });
        }
      }

      const farmerAddress = cryptoService.generateFarmerAddress(
        publicKey,
        process.env.BLOCKFROST_PROJECT_ID?.startsWith('preprod')
      );

      let transactionHash: string | null = null;
      try {
        transactionHash = await blockfrostService.submitHarvestToChain({
          farmerId,
          phoneNumber,
          plotLocation,
          cropType,
          weightKg: parseFloat(weightKg),
          timestamp,
          publicKey,
        });
      } catch (blockchainError) {
        console.error('Blockchain submission failed:', blockchainError);
      }

      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO harvest_records (
          farmer_id, phone_number, plot_location, crop_type, 
          weight_kg, timestamp, transaction_hash, public_key, 
          farmer_address, signature, indexed_on_chain
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        farmerId,
        phoneNumber,
        plotLocation,
        cropType,
        parseFloat(weightKg),
        timestamp,
        transactionHash,
        publicKey,
        farmerAddress,
        signature || null,
        transactionHash !== null,
      ];

      const result = await client.query(insertQuery, values);
      await client.query('COMMIT');

      return res.status(201).json({
        success: true,
        message: 'Harvest record submitted successfully',
        data: result.rows[0],
        blockchain: {
          submitted: transactionHash !== null,
          transactionHash,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Submit harvest error:', error);
      return res.status(500).json({
        error: 'Failed to submit harvest record',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      client.release();
    }
  }

  static async verifyHarvest(req: Request, res: Response) {
    try {
      const { recordId, transactionHash } = req.body;

      if (!recordId && !transactionHash) {
        return res.status(400).json({
          error: 'Either recordId or transactionHash is required',
        });
      }

      let query: string;
      let values: any[];

      if (recordId) {
        query = 'SELECT * FROM harvest_records WHERE id = $1';
        values = [recordId];
      } else {
        query = 'SELECT * FROM harvest_records WHERE transaction_hash = $1';
        values = [transactionHash];
      }

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }

      const record = result.rows[0];

     
      const harvestData = {
        farmerId: record.farmer_id,
        phoneNumber: record.phone_number,
        plotLocation: record.plot_location,
        cropType: record.crop_type,
        weightKg: parseFloat(record.weight_kg),
        timestamp: record.timestamp,
      };

      const signatureValid = record.signature
        ? cryptoService.verifySignature(
            harvestData,
            record.signature,
            record.public_key
          )
        : null;

      
      let blockchainValid = false;
      let blockchainMetadata = null;

      if (record.transaction_hash) {
        blockchainValid = await blockfrostService.verifyTransaction(
          record.transaction_hash
        );

        if (blockchainValid) {
          blockchainMetadata = await blockfrostService.getTransactionMetadata(
            record.transaction_hash
          );
        }
      }

      return res.json({
        success: true,
        record: {
          id: record.id,
          farmerId: record.farmer_id,
          cropType: record.crop_type,
          weightKg: record.weight_kg,
          timestamp: record.timestamp,
          farmerAddress: record.farmer_address,
        },
        verification: {
          signatureValid,
          blockchainIndexed: record.indexed_on_chain,
          blockchainValid,
          transactionHash: record.transaction_hash,
        },
        metadata: blockchainMetadata,
      });
    } catch (error) {
      console.error('Verify harvest error:', error);
      return res.status(500).json({
        error: 'Failed to verify harvest record',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getRecordsByFarmer(req: Request, res: Response) {
    try {
      const { farmerId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const query = `
        SELECT 
          id, farmer_id, phone_number, plot_location, crop_type,
          weight_kg, timestamp, transaction_hash, farmer_address,
          indexed_on_chain, created_at
        FROM harvest_records 
        WHERE farmer_id = $1 
        ORDER BY timestamp DESC 
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [
        farmerId,
        parseInt(limit as string),
        parseInt(offset as string),
      ]);

      const countQuery = 'SELECT COUNT(*) FROM harvest_records WHERE farmer_id = $1';
      const countResult = await pool.query(countQuery, [farmerId]);

      return res.json({
        success: true,
        data: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error) {
      console.error('Get records error:', error);
      return res.status(500).json({
        error: 'Failed to fetch harvest records',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getAllRecords(req: Request, res: Response) {
    try {
      const {
        cropType,
        startDate,
        endDate,
        limit = 100,
        offset = 0,
      } = req.query;

      let query = `
        SELECT 
          id, farmer_id, phone_number, plot_location, crop_type,
          weight_kg, timestamp, transaction_hash, farmer_address,
          indexed_on_chain, created_at
        FROM harvest_records 
        WHERE 1=1
      `;

      const values: any[] = [];
      let paramCount = 0;

      if (cropType) {
        paramCount++;
        query += ` AND crop_type = $${paramCount}`;
        values.push(cropType);
      }

      if (startDate) {
        paramCount++;
        query += ` AND timestamp >= $${paramCount}`;
        values.push(startDate);
      }

      if (endDate) {
        paramCount++;
        query += ` AND timestamp <= $${paramCount}`;
        values.push(endDate);
      }

      query += ` ORDER BY timestamp DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(parseInt(limit as string), parseInt(offset as string));

      const result = await pool.query(query, values);

      return res.json({
        success: true,
        data: result.rows,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error) {
      console.error('Get all records error:', error);
      return res.status(500).json({
        error: 'Failed to fetch harvest records',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const harvestController = HarvestController;