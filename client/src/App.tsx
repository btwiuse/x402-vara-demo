import React, { useState, useEffect } from 'react';
import { WalletConnect } from './components/WalletConnect';
import { useWallet } from './contexts/WalletContext';
import { api, updateApiClient, type PricingTier } from './services/api';
import './App.css';

function App() {
  const { walletClient } = useWallet();
  const [serverStatus, setServerStatus] = useState<string>('checking...');
  const [pricing, setPricing] = useState<PricingTier[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update API client when wallet changes
  useEffect(() => {
    updateApiClient(walletClient);
  }, [walletClient]);

  // Check server health on mount
  useEffect(() => {
    checkServerHealth();
    loadPricing();
  }, []);

  const checkServerHealth = async () => {
    try {
      const health = await api.getHealth();
      setServerStatus(`✅ Connected to ${health.config.network}`);
    } catch (error) {
      setServerStatus('❌ Server offline');
    }
  };

  const loadPricing = async () => {
    try {
      const data = await api.getPricing();
      setPricing(data.tiers);
    } catch (error) {
      console.error('Failed to load pricing:', error);
    }
  };

  const handlePremiumContent = async () => {
    setLoading('content');
    setErrors({});
    try {
      const result = await api.accessPremiumContent();
      setResults(prev => ({ ...prev, content: result }));
      setSessions(prev => [...prev, result.sessionId]);
    } catch (error: any) {
      setErrors(prev => ({ ...prev, content: error.message }));
    } finally {
      setLoading(null);
    }
  };

  const handlePremiumAction = async () => {
    setLoading('action');
    setErrors({});
    try {
      const result = await api.performPremiumAction('example-action', { 
        timestamp: new Date().toISOString() 
      });
      setResults(prev => ({ ...prev, action: result }));
      setSessions(prev => [...prev, result.sessionId]);
    } catch (error: any) {
      setErrors(prev => ({ ...prev, action: error.message }));
    } finally {
      setLoading(null);
    }
  };

  const handleSubscribe = async () => {
    setLoading('subscribe');
    setErrors({});
    try {
      const result = await api.subscribePremium();
      setResults(prev => ({ ...prev, subscribe: result }));
      setSessions(prev => [...prev, result.sessionId]);
    } catch (error: any) {
      setErrors(prev => ({ ...prev, subscribe: error.message }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>x402 Browser Wallet Example</h1>
        <p>Micropayments with browser wallet integration</p>
        <div className="server-status">{serverStatus}</div>
      </header>

      <main>
        <section className="wallet-section">
          <h2>1. Connect Your Wallet</h2>
          <WalletConnect />
        </section>

        <section className="pricing-section">
          <h2>2. Available Services</h2>
          <div className="pricing-grid">
            {pricing.map((tier) => (
              <div key={tier.endpoint} className="pricing-card">
                <h3>{tier.name}</h3>
                <p className="price">{tier.price}</p>
                <p className="description">{tier.description}</p>
                
                {tier.endpoint === '/api/premium/content' && (
                  <button 
                    onClick={handlePremiumContent}
                    disabled={loading === 'content'}
                    className="action-btn"
                  >
                    {loading === 'content' ? 'Processing...' : 'Access Content'}
                  </button>
                )}
                
                {tier.endpoint === '/api/premium/action' && (
                  <button 
                    onClick={handlePremiumAction}
                    disabled={loading === 'action'}
                    className="action-btn"
                  >
                    {loading === 'action' ? 'Processing...' : 'Perform Action'}
                  </button>
                )}
                
                {tier.endpoint === '/api/premium/subscribe' && (
                  <button 
                    onClick={handleSubscribe}
                    disabled={loading === 'subscribe'}
                    className="action-btn"
                  >
                    {loading === 'subscribe' ? 'Processing...' : 'Subscribe'}
                  </button>
                )}
                
                {errors[tier.endpoint?.split('/').pop() || ''] && (
                  <div className="error">{errors[tier.endpoint?.split('/').pop() || '']}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="results-section">
          <h2>3. Results</h2>
          
          {results.content && (
            <div className="result-card">
              <h3>Premium Content Unlocked</h3>
              <p>{results.content.message}</p>
              <pre>{JSON.stringify(results.content.data, null, 2)}</pre>
            </div>
          )}
          
          {results.action && (
            <div className="result-card">
              <h3>Premium Action Completed</h3>
              <p>{results.action.message}</p>
              <pre>{JSON.stringify(results.action.result, null, 2)}</pre>
            </div>
          )}
          
          {results.subscribe && (
            <div className="result-card">
              <h3>Subscription Active</h3>
              <p>{results.subscribe.message}</p>
              <pre>{JSON.stringify(results.subscribe.subscription, null, 2)}</pre>
            </div>
          )}
        </section>

        {sessions.length > 0 && (
          <section className="sessions-section">
            <h2>Active Sessions</h2>
            <ul>
              {sessions.map((sessionId) => (
                <li key={sessionId}>
                  Session: <code>{sessionId}</code>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer>
        <p>
          This example demonstrates x402 payment flows with browser wallet integration.
          Each button triggers a payment request that must be approved in MetaMask.
        </p>
      </footer>
    </div>
  );
}

export default App; 