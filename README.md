# AgriDatum Backend API

AI-Powered Farm Data Platform on Cardano - Backend Service

## 🚀 Features

- **Blockchain Integration**: Harvest data stored immutably on Cardano blockchain
- **RESTful API**: Complete endpoints for harvest submission, verification, and retrieval
- **PostgreSQL Database**: Efficient off-chain indexing and querying
- **TypeScript**: Type-safe development with full IntelliSense support
- **Cardano Wallet Integration**: Secure transaction signing and submission
- **Blockfrost API**: Reliable Cardano network interaction

## 📋 Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 13
- Cardano wallet with test ADA (for preprod)
- Blockfrost API key

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/agridatum-backend.git
cd agridatum-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Initialize database**
```bash
npm run db:init
```

5. **Start development server**
```bash
npm run dev
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `BLOCKFROST_PROJECT_ID` | Blockfrost API project ID | `preprodXXXXXXXXX` |
| `COMPANY_WALLET_MNEMONIC` | 12/24 word mnemonic phrase | `word1 word2 ...` |
| `COMPANY_WALLET_ADDRESS` | Cardano wallet address | `addr_test1q...` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |

### Getting Blockfrost API Key

1. Visit [blockfrost.io](https://blockfrost.io)
2. Sign up for free account
3. Create new project (select Preprod for testing)
4. Copy project ID to `.env`

### Setting Up Cardano Wallet

For testing on preprod:
1. Use a wallet like Eternl or Nami
2. Switch to Preprod network
3. Get test ADA from [Cardano Testnet Faucet](https://docs.cardano.org/cardano-testnet/tools/faucet)
4. Export wallet mnemonic (keep secure!)
5. Copy address and mnemonic to `.env`

## 📚 API Endpoints

### 1. Submit Harvest Data

**POST** `/api/harvest/submit`

Submit new harvest record to blockchain.

**Request Body:**
```json
{
  "farmer_id": "FARMER_001",
  "phone_number": "+254712345678",
  "plot_location": "Kiambu County, Plot 42",
  "crop_type": "Maize",
  "weight_kg": "500",
  "public_key": "farmer_public_key_here",
  "farmer_address": "addr_test1qz...",
  "signature": "optional_signature"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recordId": 1,
    "transactionHash": "abc123...",
    "timestamp": "2024-01-15T10:30:00Z",
    "message": "Harvest data submitted successfully to blockchain"
  }
}
```

### 2. Verify Harvest Record

**POST** `/api/harvest/verify`

Verify harvest record on blockchain.

**Request Body:**
```json
{
  "transaction_hash": "abc123..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "onChainData": {
      "hash": "abc123...",
      "block": "12345",
      "blockHeight": 1234567,
      "metadata": {...}
    },
    "dbRecord": {...},
    "message": "Harvest record verified successfully"
  }
}
```

### 3. Get Farmer Records

**GET** `/api/harvest/records/:farmerId?limit=50&offset=0`

Retrieve all harvest records for a specific farmer.

**Response:**
```json
{
  "success": true,
  "data": {
    "farmerId": "FARMER_001",
    "records": [
      {
        "id": 1,
        "farmer_id": "FARMER_001",
        "crop_type": "Maize",
        "weight_kg": 500,
        "timestamp": "2024-01-15T10:30:00Z",
        "transaction_hash": "abc123...",
        "indexed_on_chain": true
      }
    ],
    "count": 1
  }
}
```

## 🗄️ Database Schema

```sql
CREATE TABLE harvest_records (
  id SERIAL PRIMARY KEY,
  farmer_id VARCHAR(64) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  plot_location TEXT NOT NULL,
  crop_type VARCHAR(50) NOT NULL,
  weight_kg DECIMAL(10,2) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  transaction_hash VARCHAR(64) UNIQUE,
  public_key VARCHAR(64) NOT NULL,
  farmer_address TEXT NOT NULL,
  signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  indexed_on_chain BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_farmer_id ON harvest_records(farmer_id);
CREATE INDEX idx_transaction_hash ON harvest_records(transaction_hash);
```

## 🏗️ Project Structure

```
src/
├── config/
│   └── database.ts          # Database configuration
├── controllers/
│   └── harvest.controller.ts # Request handlers
├── middleware/
│   ├── error.middleware.ts   # Error handling
│   └── validation.middleware.ts # Input validation
├── routes/
│   └── harvest.routes.ts     # API routes
├── services/
│   ├── cardano.service.ts    # Blockchain operations
│   └── harvest.service.ts    # Database operations
├── types/
│   └── harvest.types.ts      # TypeScript types
└── index.ts                  # Application entry
```

## 🧪 Testing

Run tests:
```bash
npm test
```

Test API endpoints:
```bash
# Using curl
curl -X POST http://localhost:3000/api/harvest/submit \
  -H "Content-Type: application/json" \
  -d '{
    "farmer_id": "TEST_001",
    "phone_number": "+254712345678",
    "plot_location": "Test Farm",
    "crop_type": "Maize",
    "weight_kg": "100",
    "public_key": "test_key",
    "farmer_address": "addr_test1qz..."
  }'
```

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use mainnet Blockfrost project ID
- [ ] Configure production database
- [ ] Enable SSL for database connections
- [ ] Set up proper logging
- [ ] Configure CORS appropriately
- [ ] Implement rate limiting
- [ ] Set up monitoring and alerts

### Deploy to Heroku

```bash
heroku create agridatum-api
heroku addons:create heroku-postgresql:hobby-dev
heroku config:set BLOCKFROST_PROJECT_ID=your_project_id
heroku config:set COMPANY_WALLET_MNEMONIC="your mnemonic"
heroku config:set COMPANY_WALLET_ADDRESS=your_address
git push heroku main
```

## 🔒 Security Considerations

- **Never commit** `.env` file or wallet mnemonics
- Use environment variables for all sensitive data
- Implement rate limiting in production
- Validate all user inputs
- Use HTTPS in production
- Regularly update dependencies
- Monitor blockchain wallet balance

## 📖 Additional Resources

- [Cardano Documentation](https://docs.cardano.org/)
- [Blockfrost API Docs](https://docs.blockfrost.io/)
- [Cardano Serialization Library](https://github.com/Emurgo/cardano-serialization-lib)

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines first.

## 📄 License

MIT License - see LICENSE file for details

## 💬 Support

For issues and questions:
- GitHub Issues: [Report Bug](https://github.com/yourusername/agridatum-backend/issues)
- Email: support@agridatum.io

---

Built with ❤️ for African farmers