import React, { createContext, useContext, useEffect, useState } from "react";
import { web3AccountsSubscribe, web3Enable } from "@polkadot/extension-dapp";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";

interface PolkadotWalletContextType {
  isConnected: boolean;
  address: string | null;
  accounts: InjectedAccountWithMeta[];
  selectedAccount: InjectedAccountWithMeta | null;
  isWalletInstalled: boolean;
  error: string | null;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  setSelectedAccount: (account: InjectedAccountWithMeta | null) => void;
  walletNotInstalledMessage: string;
}

const WalletContext = createContext<PolkadotWalletContextType | undefined>(
  undefined,
);

export const WalletProvider = ({ children }) => {
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<
    InjectedAccountWithMeta | null
  >(null);
  const [isWalletInstalled, setIsWalletInstalled] = useState(true);

  useEffect(() => {
    const initWallet = async () => {
      const extensions = await web3Enable("Gear dApp");

      if (extensions.length === 0) {
        setIsWalletInstalled(false);
        return null;
      }

      const unsubscribe = await web3AccountsSubscribe((injectedAccounts) => {
        setAccounts(injectedAccounts);

        if (injectedAccounts.length === 0) {
          setIsWalletInstalled(false);
        } else {
          setIsWalletInstalled(true);
        }

        // If the selected account is no longer available, clear the selection
        if (
          selectedAccount &&
          !injectedAccounts.some((acc) =>
            acc.address === selectedAccount.address
          )
        ) {
          setSelectedAccount(null);
        }
      });

      // Return the unsubscribe function to clean up on unmount
      return unsubscribe;
    };

    const unsubscribePromise = initWallet();

    // Cleanup function
    return () => {
      unsubscribePromise.then((unsubscribe) => unsubscribe && unsubscribe());
    };
  }, [selectedAccount]);

  const walletNotInstalledMessage =
    "No wallet found. Please install a compatible wallet extension: SubWallet / Nova Wallet / Talisman";

  return (
    <WalletContext.Provider
      value={{
        accounts,
        isWalletInstalled,
        selectedAccount,
        setSelectedAccount,
        walletNotInstalledMessage,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): PolkadotWalletContextType =>
  useContext(WalletContext);
