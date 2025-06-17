import axios from "axios";
import type { AxiosInstance } from "axios";
import type { WalletClient } from "viem";
import { withPaymentInterceptor } from "x402-axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

// Base axios instance without payment interceptor
const baseApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// This will be dynamically set based on wallet connection
let apiClient: AxiosInstance = baseApiClient;

// Update the API client with a wallet
export function updateApiClient(walletClient: WalletClient | null) {
  if (walletClient && walletClient.account) {
    // Create axios instance with x402 payment interceptor
    apiClient = withPaymentInterceptor(baseApiClient, walletClient as any);
    console.log("💳 API client updated with wallet:", walletClient.account.address);
  } else {
    // No wallet connected - reset to base client
    apiClient = baseApiClient;
    console.log("⚠️ API client reset - no wallet connected");
  }
}

// API endpoints
export const api = {
  // Free endpoints
  getHealth: async () => {
    const response = await apiClient.get("/api/health");
    return response.data;
  },

  getPricing: async () => {
    const response = await apiClient.get("/api/pricing");
    return response.data;
  },

  getSession: async (sessionId: string) => {
    const response = await apiClient.get(`/api/session/${sessionId}`);
    return response.data;
  },

  // Paid endpoints
  accessPremiumContent: async () => {
    console.log("🔐 Requesting premium content access...");
    const response = await apiClient.post("/api/premium/content");
    console.log("✅ Premium content unlocked:", response.data);
    return response.data;
  },

  performPremiumAction: async (action: string, parameters?: any) => {
    console.log("⚡ Performing premium action:", action);
    const response = await apiClient.post("/api/premium/action", {
      action,
      parameters,
    });
    console.log("✅ Premium action completed:", response.data);
    return response.data;
  },

  subscribePremium: async () => {
    console.log("🌟 Subscribing to premium...");
    const response = await apiClient.post("/api/premium/subscribe");
    console.log("✅ Premium subscription activated:", response.data);
    return response.data;
  },
};

// Types for API responses
export interface PricingTier {
  name: string;
  endpoint: string;
  price: string;
  description: string;
}

export interface Session {
  id: string;
  createdAt: Date;
  data?: any;
} 