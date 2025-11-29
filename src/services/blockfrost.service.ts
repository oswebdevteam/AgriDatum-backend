// src/services/blockfrost.service.ts
import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import * as bip39 from 'bip39';
import { blake2b } from 'blakejs';  // ✅ CHANGED - pure JS, no compilation needed
import { createRequire } from 'module';

// Use CommonJS require for Cardano WASM
const require = createRequire(import.meta.url);
let CardanoWasm: any = null;

function loadCardanoWasm() {
  if (!CardanoWasm) {
    try {
      CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
    } catch (error) {
      console.error('Failed to load Cardano WASM library:', error);
      throw new Error('Cardano library not available.');
    }
  }
  return CardanoWasm;
}

interface HarvestMetadata {
  farmerId: string;
  phoneNumber: string;
  plotLocation: string;
  cropType: string;
  weightKg: number;
  timestamp: string;
  publicKey: string;
}

export class BlockfrostService {
  private api: BlockFrostAPI;
  private companyWallet: any = null;
  private initialized: boolean = false;

  constructor() {
    const projectId = process.env.BLOCKFROST_PROJECT_ID;
    if (!projectId) {
      throw new Error('BLOCKFROST_PROJECT_ID not configured');
    }

    this.api = new BlockFrostAPI({
      projectId,
      network: projectId.startsWith('preprod') ? 'preprod' : 'mainnet',
    });
  }

  private async initialize() {
    if (this.initialized) return;
    
    const CSL = loadCardanoWasm();
    this.companyWallet = this.deriveWalletFromMnemonic(
      process.env.COMPANY_WALLET_MNEMONIC || ''
    );
    
    this.initialized = true;
  }

  private deriveWalletFromMnemonic(mnemonic: string) {
    const CSL = loadCardanoWasm();
    
    if (!mnemonic || mnemonic.split(' ').length < 15) {
      throw new Error('Invalid mnemonic phrase. Must be 15, 18, 21, or 24 words.');
    }

    const entropy = bip39.mnemonicToEntropy(mnemonic);
    const rootKey = CSL.Bip32PrivateKey.from_bip39_entropy(
      Buffer.from(entropy, 'hex'),
      Buffer.from('')
    );

    const accountKey = rootKey
      .derive(this.harden(1852))
      .derive(this.harden(1815))
      .derive(this.harden(0));

    const paymentKey = accountKey
      .derive(0)
      .derive(0)
      .to_raw_key();

    const publicKey = paymentKey.to_public();
    const publicKeyHash = publicKey.hash();

    const networkId = process.env.BLOCKFROST_PROJECT_ID?.startsWith('preprod')
      ? CSL.NetworkInfo.testnet_preprod().network_id()
      : CSL.NetworkInfo.mainnet().network_id();

    const paymentCredential = CSL.Credential.from_keyhash(publicKeyHash);
    const stakeCredential = CSL.Credential.from_keyhash(publicKeyHash);

    const baseAddr = CSL.BaseAddress.new(
      networkId,
      paymentCredential,
      stakeCredential
    );

    return {
      address: baseAddr.to_address().to_bech32(),
      privateKey: paymentKey,
      publicKey: publicKey,
    };
  }

  private harden(num: number): number {
    return 0x80000000 + num;
  }

  async submitHarvestToChain(metadata: HarvestMetadata): Promise<string> {
    await this.initialize();
    const CSL = loadCardanoWasm();
    
    try {
      const utxos = await this.api.addressesUtxos(this.companyWallet.address);
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs available. Please fund the company wallet.');
      }

      const protocolParams = await this.api.epochsLatestParameters();

      const linearFee = CSL.LinearFee.new(
        CSL.BigNum.from_str(protocolParams.min_fee_a.toString()),
        CSL.BigNum.from_str(protocolParams.min_fee_b.toString())
      );

      const txBuilderCfg = CSL.TransactionBuilderConfigBuilder.new()
        .fee_algo(linearFee)
        .pool_deposit(CSL.BigNum.from_str(protocolParams.pool_deposit))
        .key_deposit(CSL.BigNum.from_str(protocolParams.key_deposit))
        .max_value_size(parseInt(protocolParams.max_val_size || '5000'))
        .max_tx_size(protocolParams.max_tx_size)
        .coins_per_utxo_byte(
          CSL.BigNum.from_str(protocolParams.coins_per_utxo_size || '4310')
        )
        .build();

      const txBuilder = CSL.TransactionBuilder.new(txBuilderCfg);

      const firstUtxo = utxos[0];
      const txHash = CSL.TransactionHash.from_bytes(Buffer.from(firstUtxo.tx_hash, 'hex'));
      const txInput = CSL.TransactionInput.new(txHash, firstUtxo.tx_index);
      const inputValue = CSL.Value.new(CSL.BigNum.from_str(firstUtxo.amount[0].quantity));
      const inputAddress = CSL.Address.from_bech32(this.companyWallet.address);
      
      // Try different input methods
      try {
        if (typeof txBuilder.add_regular_input === 'function') {
          txBuilder.add_regular_input(inputAddress, txInput, inputValue);
        } else if (typeof txBuilder.add_key_input === 'function') {
          txBuilder.add_key_input(this.companyWallet.publicKey.hash(), txInput, inputValue);
        } else {
          txBuilder.add_input(inputAddress, txInput, inputValue);
        }
      } catch (inputError: any) {
        throw new Error(`Unable to add transaction input: ${inputError.message}`);
      }

      // Add metadata
      const auxData = CSL.AuxiliaryData.new();
      const generalMetadata = CSL.GeneralTransactionMetadata.new();
      
      const splitString = (str: string, maxLen: number = 64): string[] => {
        const chunks: string[] = [];
        for (let i = 0; i < str.length; i += maxLen) {
          chunks.push(str.substring(i, i + maxLen));
        }
        return chunks;
      };

      const publicKeyChunks = splitString(metadata.publicKey, 64);
      const plotLocationChunks = splitString(metadata.plotLocation, 64);

      const metadataJson: any = {
        agridatum: {
          harvest: {
            farmerId: metadata.farmerId.substring(0, 64),
            phoneNumber: metadata.phoneNumber.substring(0, 64),
            plotLocation: plotLocationChunks.length === 1 ? plotLocationChunks[0] : plotLocationChunks,
            cropType: metadata.cropType.substring(0, 64),
            weightKg: metadata.weightKg.toString(),
            timestamp: metadata.timestamp.substring(0, 64),
            publicKey: publicKeyChunks.length === 1 ? publicKeyChunks[0] : publicKeyChunks,
          }
        }
      };

      const metadatum = CSL.encode_json_str_to_metadatum(
        JSON.stringify(metadataJson),
        CSL.MetadataJsonSchema.NoConversions
      );

      generalMetadata.insert(CSL.BigNum.from_str('721'), metadatum);
      auxData.set_metadata(generalMetadata);
      txBuilder.set_auxiliary_data(auxData);

      const outputAddr = CSL.Address.from_bech32(this.companyWallet.address);
      txBuilder.add_change_if_needed(outputAddr);

      // ✅ FIXED: Build and hash transaction properly with blakejs
      const txBody = txBuilder.build();
      const bodyBytes = txBody.to_bytes();

      // Use blake2b-256 (32 bytes) for Cardano transaction hashing
      const txHashBytes = blake2b(bodyBytes, null, 32); // 32 bytes = 256 bits

      const txHashObj = CSL.TransactionHash.from_bytes(Buffer.from(txHashBytes));
      
      const witnesses = CSL.TransactionWitnessSet.new();
      const vkeyWitnesses = CSL.Vkeywitnesses.new();

      const vkeyWitness = CSL.make_vkey_witness(txHashObj, this.companyWallet.privateKey);
      vkeyWitnesses.add(vkeyWitness);
      witnesses.set_vkeys(vkeyWitnesses);

      const transaction = CSL.Transaction.new(txBody, witnesses, auxData);

      const signedTx = Buffer.from(transaction.to_bytes()).toString('hex');
      const submittedTxHash = await this.api.txSubmit(signedTx);

      return submittedTxHash;
    } catch (error: any) {
      console.error('Blockchain submission error:', error);
      throw new Error(`Failed to submit to blockchain: ${error.message || error}`);
    }
  }

  async verifyTransaction(txHash: string): Promise<boolean> {
    try {
      const tx = await this.api.txs(txHash);
      return tx && tx.block !== null;
    } catch (error) {
      return false;
    }
  }

  async getTransactionMetadata(txHash: string): Promise<any> {
    try {
      return await this.api.txsMetadata(txHash);
    } catch (error) {
      return null;
    }
  }

  async getCompanyAddress(): Promise<string> {
    await this.initialize();
    return this.companyWallet.address;
  }

  async getWalletBalance(): Promise<any> {
    await this.initialize();
    try {
      return await this.api.addresses(this.companyWallet.address);
    } catch (error) {
      return null;
    }
  }
}

export const blockfrostService = new BlockfrostService();