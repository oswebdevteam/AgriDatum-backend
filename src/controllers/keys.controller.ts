import type { Request, Response } from 'express';
import { cryptoService } from '../services/crypto.service.js';
import { sha256 } from 'js-sha256';

export class KeysController {
  static async generateKeys(req: Request, res: Response) {
    try {
      const { seedInput, harvestData } = req.body;

      if (!seedInput || typeof seedInput !== 'string') {
        return res.status(400).json({
          error: 'seedInput is required',
        });
      }

      const { publicKey, privateKey } = cryptoService.generateKeyPair();
      
      const farmerId = sha256(seedInput).slice(0, 16);
      
      const farmerAddress = cryptoService.generateFarmerAddress(publicKey, true);

      let signature: string | undefined;
      if (harvestData) {
        try {
          signature = cryptoService.signData(harvestData, privateKey);
        } catch (error) {
          console.error('Failed to sign data:', error);
        }
      }
      
      // Only public key and address are returned to the client
      return res.json({
        success: true,
        publicKey,
        farmerAddress,
        farmerId,
        signature
      });
    } catch (error) {
      console.error('Key generation error:', error);
      return res.status(500).json({
        error: 'Failed to generate keys',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const keysController = KeysController;