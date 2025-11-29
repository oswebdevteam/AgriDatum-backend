// src/services/crypto.service.ts
import * as crypto from 'crypto';
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';

export interface HarvestData {
  farmerId: string;
  phoneNumber: string;
  plotLocation: string;
  cropType: string;
  weightKg: number;
  timestamp: string;
}

export class CryptoService {
  /**
   * Generate key pair for farmer
   */
  static generateKeyPair(): {
    publicKey: string;
    privateKey: string;
  } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'hex' },
      privateKeyEncoding: { type: 'pkcs8', format: 'hex' },
    }) as unknown as { publicKey: string; privateKey: string };

    return { publicKey, privateKey };
  }

  /**
   * Sign harvest data
   */
  static signData(data: HarvestData, privateKeyHex: string): string {
    const dataString = JSON.stringify(data);
    
    const privateKey = crypto.createPrivateKey({
      key: Buffer.from(privateKeyHex, 'hex'),
      format: 'der',
      type: 'pkcs8',
    });

    const signature = crypto.sign(null, Buffer.from(dataString), privateKey);
    return signature.toString('hex');
  }

  /**
   * Verify signature
   */
  static verifySignature(
    data: HarvestData,
    signature: string,
    publicKeyHex: string
  ): boolean {
    try {
      const dataString = JSON.stringify(data);
      
      const publicKey = crypto.createPublicKey({
        key: Buffer.from(publicKeyHex, 'hex'),
        format: 'der',
        type: 'spki',
      });

      return crypto.verify(
        null,
        Buffer.from(dataString),
        publicKey,
        Buffer.from(signature, 'hex')
      );
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Hash data for integrity check
   */
  static hashData(data: HarvestData): string {
    const dataString = JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Generate farmer address from public key (Cardano-style)
   */
  static generateFarmerAddress(publicKeyHex: string, isTestnet: boolean = true): string {
    try {
      // Simple address generation - in production, use proper Cardano address derivation
      const hash = crypto.createHash('sha256').update(publicKeyHex).digest('hex');
      const prefix = isTestnet ? 'addr_test1' : 'addr1';
      return `${prefix}${hash.substring(0, 58)}`;
    } catch (error) {
      console.error('Address generation error:', error);
      throw error;
    }
  }

  /**
   * Validate public key format
   */
  static isValidPublicKey(publicKeyHex: string): boolean {
    try {
      if (!/^[0-9a-fA-F]+$/.test(publicKeyHex)) return false;
      if (publicKeyHex.length < 64) return false;
      
      crypto.createPublicKey({
        key: Buffer.from(publicKeyHex, 'hex'),
        format: 'der',
        type: 'spki',
      });
      
      return true;
    } catch {
      return false;
    }
  }
}

export const cryptoService = CryptoService;