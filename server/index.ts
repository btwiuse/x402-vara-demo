import { config } from "dotenv";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { paymentMiddleware, Network, Resource } from "x402-hono";
import { v4 as uuidv4 } from "uuid";

config();

// Configuration from environment variables
const facilitatorUrl = process.env.FACILITATOR_URL as Resource || "https://x402.org/facilitator";
const payTo = process.env.ADDRESS as `0x${string}`;
const network = (process.env.NETWORK as Network) || "base-sepolia";
const port = parseInt(process.env.PORT || "3001");

if (!payTo) {
  console.error("❌ Please set your wallet ADDRESS in the .env file");
  process.exit(1);
}

const app = new Hono();

// Enable CORS for frontend
app.use("/*", cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
}));

// Simple in-memory storage for sessions (use Redis/DB in production)
interface Session {
  id: string;
  createdAt: Date;
  data?: any;
  userId?: string;
}

const sessions = new Map<string, Session>();

// Configure x402 payment middleware with different pricing tiers
app.use(
  paymentMiddleware(
    payTo,
    {
      // Different endpoints can have different prices
      "/api/premium/content": {
        price: "$0.10",
        network,
      },
      "/api/premium/action": {
        price: "$1.00",
        network,
      },
      "/api/premium/subscribe": {
        price: "$5.00",
        network,
      },
    },
    {
      url: facilitatorUrl,
    },
  ),
);

// Free endpoint - health check
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    message: "Server is running",
    config: {
      network,
      payTo,
      facilitator: facilitatorUrl,
    },
  });
});

// Free endpoint - get pricing info
app.get("/api/pricing", (c) => {
  return c.json({
    tiers: [
      {
        name: "Basic Content",
        endpoint: "/api/premium/content",
        price: "$0.10",
        description: "Access premium content for 24 hours",
      },
      {
        name: "Premium Action",
        endpoint: "/api/premium/action",
        price: "$1.00",
        description: "Perform a premium action",
      },
      {
        name: "Monthly Access",
        endpoint: "/api/premium/subscribe",
        price: "$5.00",
        description: "30-day unlimited access",
      },
    ],
  });
});

// Paid endpoint - access premium content ($0.10)
app.post("/api/premium/content", (c) => {
  const sessionId = uuidv4();
  const session: Session = {
    id: sessionId,
    createdAt: new Date(),
    data: {
      type: "content",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  };

  sessions.set(sessionId, session);

  return c.json({
    success: true,
    sessionId,
    message: "Payment successful! You now have 24-hour access to premium content.",
    data: {
      content: "This is exclusive premium content that required payment to access.",
      unlockedFeatures: [
        "Advanced analytics",
        "Export functionality",
        "Priority support",
      ],
    },
  });
});

// Paid endpoint - perform premium action ($1.00)
app.post("/api/premium/action", async (c) => {
  const body = await c.req.json();
  const { action, parameters } = body;

  const sessionId = uuidv4();
  const session: Session = {
    id: sessionId,
    createdAt: new Date(),
    data: {
      type: "action",
      action,
      parameters,
      executedAt: new Date(),
    },
  };

  sessions.set(sessionId, session);

  return c.json({
    success: true,
    sessionId,
    message: `Premium action "${action}" executed successfully!`,
    result: {
      action,
      status: "completed",
      timestamp: new Date().toISOString(),
    },
  });
});

// Paid endpoint - subscribe for monthly access ($5.00)
app.post("/api/premium/subscribe", (c) => {
  const sessionId = uuidv4();
  const session: Session = {
    id: sessionId,
    createdAt: new Date(),
    data: {
      type: "subscription",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  };

  sessions.set(sessionId, session);

  return c.json({
    success: true,
    sessionId,
    message: "Subscription activated! You have 30 days of unlimited access.",
    subscription: {
      status: "active",
      expiresAt: session.data.expiresAt,
      benefits: [
        "Unlimited premium content access",
        "All premium actions included",
        "Priority support",
        "Early access to new features",
      ],
    },
  });
});

// Free endpoint - check session status
app.get("/api/session/:sessionId", (c) => {
  const sessionId = c.req.param("sessionId");
  const session = sessions.get(sessionId);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({
    session: {
      id: session.id,
      createdAt: session.createdAt,
      data: session.data,
    },
  });
});

console.log(`
🚀 x402 Browser Wallet Example Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Accepting payments to: ${payTo}
🔗 Network: ${network}
🌐 Port: ${port}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

serve({
  fetch: app.fetch,
  port,
}); 