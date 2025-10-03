import React from 'react';
import { useWallet } from '../contexts/PolkadotWalletContext';

export function WalletConnect() {
  const { accounts, selectedAccount, setSelectedAccount, isWalletInstalled, walletNotInstalledMessage } = useWallet();

  const formatAddress = (addr: string) => {
    // return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    return addr;
  };

  const connectWallet = async () => {
    if (accounts.length > 0) {
      setSelectedAccount(accounts[0]);
    }
  };

  const disconnectWallet = () => {
    setSelectedAccount(null);
  };

  if (selectedAccount) {
    return (
      <div className="wallet-connected">
        <div className="wallet-info">
          <span className="status-indicator">●</span>
          <span className="address">{formatAddress(selectedAccount.address)}</span>
          <button onClick={disconnectWallet} className="disconnect-btn">
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  if (!isWalletInstalled) {
    return (
      <div className="wallet-connect">
        <div className="error-message">
          {walletNotInstalledMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-connect">
      <button
        onClick={connectWallet}
        className="connect-btn"
      >
        Connect Wallet
      </button>
      {accounts.length === 0 && (
        <div className="error-message">
          No accounts found in wallet
        </div>
      )}
    </div>
  );
} 
