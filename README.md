# x402 Browser Wallet Example

A complete example demonstrating x402 payment integration with browser wallet (MetaMask) support. This example shows how to build micropayment-enabled services that users can access by signing payment requests with their own wallets.

## Overview

This example includes:
- **Server**: Hono-based API with x402 payment middleware
- **Client**: React app with viem wallet integration
- **Payment Flows**: Multiple pricing tiers ($0.10, $1.00, $5.00)
- **Session Management**: Track payments and active sessions

## Quick Start

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Configure the Server

Create `server/.env`:
```env
FACILITATOR_URL=https://x402.org/facilitator
NETWORK=base-sepolia
ADDRESS=0x_YOUR_WALLET_ADDRESS_HERE
PORT=3001
```

### 3. Run Both Server and Client

```bash
npm run dev
```

This starts:
- Server on http://localhost:3001
- Client on http://localhost:5173

## Architecture

### Server (`/server`)

The server demonstrates x402 payment middleware with three pricing tiers:

```typescript
// Different endpoints with different prices
"/api/premium/content": { price: "$0.10" }    // Access content
"/api/premium/action": { price: "$1.00" }     // Perform action  
"/api/premium/subscribe": { price: "$5.00" }  // Monthly subscription
```

### Client (`/client`)

The React client shows:
1. **Wallet Connection**: Connect MetaMask and switch to Base Sepolia
2. **Payment Requests**: Each button triggers a payment signature request
3. **Session Display**: Shows successful payments and active sessions

## Key Components

### Wallet Context
```typescript
// Manages wallet connection state
const { isConnected, address, walletClient } = useWallet();
```

### API Service
```typescript
// Updates axios with x402 payment interceptor
updateApiClient(walletClient);

// Make paid requests
const result = await api.accessPremiumContent();
```

### Payment Flow

1. User connects wallet (MetaMask)
2. Client configures axios with x402 interceptor
3. User clicks a payment button
4. Server returns 402 Payment Required
5. x402 interceptor catches this and prompts for signature
6. User signs payment authorization in MetaMask
7. Payment is processed and content is delivered

## Use Cases

This pattern can be adapted for:
- **Content Access**: Articles, videos, premium features
- **API Usage**: Pay-per-call APIs, compute resources
- **Subscriptions**: Time-based access to services
- **Actions**: One-time operations, transactions
- **Gaming**: In-game purchases, continues, power-ups

## Customization

### Adding New Endpoints

1. Add to server payment middleware:
```typescript
"/api/your-endpoint": {
  price: "$0.50",
  network: "base-sepolia"
}
```

2. Create the endpoint handler:
```typescript
app.post("/api/your-endpoint", (c) => {
  // Your logic here
  return c.json({ success: true });
});
```

3. Call from client:
```typescript
const result = await apiClient.post("/api/your-endpoint");
```

### Changing Networks

Update in `server/.env`:
```env
NETWORK=base-mainnet  # For production
```

## Testing

1. Get Base Sepolia ETH from [Coinbase Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
2. Get Base Sepolia USDC from [Circle Faucet](https://faucet.circle.com/)
3. Connect MetaMask to the app
4. Try different payment buttons
5. Check the console for payment flow logs

## Production Considerations

- Use Redis or a database for session storage
- Add proper authentication for user-specific content
- Implement rate limiting and abuse prevention
- Set up monitoring for payment events
- Use mainnet configuration for real payments

## Resources

- [x402 Documentation](https://x402.org)
- [Viem Documentation](https://viem.sh)
- [Base Network](https://base.org)
- [MetaMask Integration](https://metamask.io/developers/)
