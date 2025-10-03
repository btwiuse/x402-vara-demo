import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { facilitatorRouter, requirePayment } from "x402-vara/server";

import "dotenv/config";

// Configuration from environment variables
const payTo = process.env.ADDRESS ||
  "kGkLEU3e3XXkJp2WK4eNpVmSab5xUNL9QtmLPh8QfCL2EgotW";
const network = process.env.NETWORK || "vara-testnet";
const port = parseInt(process.env.PORT || "3001");
const facilitator = process.env.FACILITATOR_URL;

if (!payTo) {
  console.error("❌ Please set your wallet ADDRESS in the .env file");
  process.exit(1);
}

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
}));

app.use("/api/facilitator", facilitatorRouter);

// Simple in-memory storage for sessions (use Redis/DB in production)
interface Session {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  type: "24hour" | "onetime";
  used?: boolean;
}

const sessions = new Map<string, Session>();

// Free endpoint - health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
    config: {
      network,
      payTo,
      facilitator,
    },
  });
});

// Free endpoint - get payment options
app.get("/api/payment-options", (req, res) => {
  res.json({
    options: [
      {
        name: "24-Hour Access",
        endpoint: "/api/pay/session",
        price: "1.00 VARA",
        description: "Get a session ID for 24 hours of unlimited access",
      },
      {
        name: "One-Time Access",
        endpoint: "/api/pay/onetime",
        price: "0.10 VARA",
        description: "Single use payment for immediate access",
      },
    ],
  });
});

// Paid endpoint - 24-hour session access ($1.00)
app.get(
  "/api/pay/session",
  requirePayment({
    price: {
      amount: "1.00",
      asset: "VARA",
    },
    description: "24-hour access to premium content",
    network,
    payTo,
    facilitator,
  }),
  (req, res) => {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const session = {
      id: sessionId,
      createdAt: now,
      expiresAt,
      type: "24hour",
    };

    sessions.set(sessionId, session);

    const txHash = res.get("X-PAYMENT-RESPONSE");

    res.json({
      success: true,
      sessionId,
      txHash,
      message: "24-hour access granted!",
      session: {
        id: sessionId,
        type: "24hour",
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        validFor: "24 hours",
      },
    });
  },
);

// Paid endpoint - one-time access/payment ($0.10)
app.get(
  "/api/pay/onetime",
  requirePayment({
    price: {
      amount: "0.10",
      asset: "VARA",
    },
    description: "One-time access to premium content",
    network,
    payTo,
    facilitator,
  }),
  (req, res) => {
    const sessionId = uuidv4();
    const now = new Date();

    const session = {
      id: sessionId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000), // 5 minutes to use
      type: "onetime",
      used: false,
    };

    sessions.set(sessionId, session);

    const txHash = res.get("X-PAYMENT-RESPONSE");

    res.json({
      success: true,
      sessionId,
      txHash,
      message: "One-time access granted!",
      access: {
        id: sessionId,
        type: "onetime",
        createdAt: now.toISOString(),
        validFor: "5 minutes (single use)",
      },
    });
  },
);

// Paid endpoint - one-time access/payment ($0.10)
app.get(
  "/api/pay/hello",
  requirePayment({
    price: {
      amount: "0.10",
      asset: "VARA",
    },
    description: "Example paid access to a GET endpoint",
    network,
    payTo,
    facilitator,
  }),
  (req, res) => {
    const txHash = res.get("X-PAYMENT-RESPONSE");

    res.json({
      hello: "world",
      txHash,
    });
  },
);

// Free endpoint - validate session
app.get("/api/session/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ valid: false, error: "Session not found" });
  }

  const now = new Date();
  const isExpired = now > session.expiresAt;
  const isUsed = session.type === "onetime" && session.used;

  if (isExpired || isUsed) {
    return res.json({
      valid: false,
      error: isExpired ? "Session expired" : "One-time access already used",
      session: {
        id: session.id,
        type: session.type,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        used: session.used,
      },
    });
  }

  // Mark one-time sessions as used
  if (session.type === "onetime") {
    session.used = true;
    sessions.set(sessionId, session);
  }

  res.json({
    valid: true,
    session: {
      id: session.id,
      type: session.type,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      remainingTime: session.expiresAt.getTime() - now.getTime(),
    },
  });
});

// Free endpoint - list active sessions (for demo purposes)
app.get("/api/sessions", (req, res) => {
  const activeSessions = Array.from(sessions.values())
    .filter((session) => {
      const isExpired = new Date() > session.expiresAt;
      const isUsed = session.type === "onetime" && session.used;
      return !isExpired && !isUsed;
    })
    .map((session) => ({
      id: session.id,
      type: session.type,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    }));

  res.json({ sessions: activeSessions });
});

app.listen(port, () => {
  console.log(`
🚀 x402 Payment Template Server (Express)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Accepting payments to: ${payTo}
🔗 Network: ${network}
🌐 Port: ${port}
🖥️ Facilitator: ${facilitator ?? "(built-in)"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Payment Options:
   - /api/pay/session 24-Hour Session: 1.00 VARA
   - /api/pay/onetime One-Time Access: 0.10 VARA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛠️  This is a template! Customize it for your app.
📚 Learn more: https://x402.org
💬 Get help: https://discord.gg/invite/cdp
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});
