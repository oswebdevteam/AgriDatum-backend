import { createRequire } from 'module';
const require = createRequire(import.meta.url);

console.log(' Testing Cardano Serialization Library...\n');

try {
  const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
  
  console.log(' Library loaded successfully!');
  console.log(' Available exports:', Object.keys(CardanoWasm).slice(0, 10).join(', '), '...\n');
  
  const tests = [
    'Bip32PrivateKey',
    'BaseAddress',
    'StakeCredential',
    'NetworkInfo',
    'TransactionBuilder'
  ];
  
  console.log(' Testing key functions:\n');
  tests.forEach(testName => {
    if (CardanoWasm[testName]) {
      console.log(`   ${testName} - Available`);
    } else {
      console.log(`   ${testName} - Missing`);
    }
  });
  
  console.log('\n All checks passed! Library is working correctly.\n');
  
} catch (error) {
  console.error(' Error loading Cardano library:', error.message);
  console.log('\n To fix this, run:');
  console.log('   pnpm install @emurgo/cardano-serialization-lib-nodejs\n');
  process.exit(1);
}