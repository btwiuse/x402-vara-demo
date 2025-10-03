# x402-vara Server Example

This server demonstrates x402-vara payment integration with multiple pricing tiers.

## Setup

1. Create a `.env` file:
```env
NETWORK=vara-testnet
ADDRESS=kGkLEU3e3XXkJp2WK4eNpVmSab5xUNL9QtmLPh8QfCL2EgotW
PORT=3001
```

2. Install dependencies:
```bash
bun install
```

3. Run the server:
```bash
bun dev
```

## Endpoints

### Free Endpoints
- `GET /api/health` - Server health check
- `GET /api/pricing` - Get pricing information
- `GET /api/session/:sessionId` - Check session status

### Paid Endpoints
- `POST /api/pay/session` - Purchase 24-hour session (1.00 VARA)
- `POST /api/pay/onetime` - Purchase one-time access (0.10 VARA)
