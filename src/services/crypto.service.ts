import * as crypto from 'crypto';

export interface HarvestData {
  farmerId: string;
  phoneNumber: string;
  plotLocation: string;
  cropType: string;
  weightKg: number;
  timestamp: string;
}

export class CryptoService {
  static generateKeyPair(): {
    publicKey: string;
    privateKey: string;
  } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { 
        type: 'spki', 
        format: 'der'  
      },
      privateKeyEncoding: { 
        type: 'pkcs8', 
        format: 'der' 
      },
    });

    return { 
      publicKey: publicKey.toString('hex'), 
      privateKey: privateKey.toString('hex') 
    };
  }

  
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

  
   
  static hashData(data: HarvestData): string {
    const dataString = JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  
  static generateFarmerAddress(publicKeyHex: string, isTestnet: boolean = true): string {
    try {
      const hash = crypto.createHash('sha256').update(publicKeyHex).digest('hex');
      const prefix = isTestnet ? 'addr_test1' : 'addr1';
      return `${prefix}${hash.substring(0, 58)}`;
    } catch (error) {
      console.error('Address generation error:', error);
      throw error;
    }
  }

  
   
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