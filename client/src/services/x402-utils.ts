import { ApiPromise, WsProvider } from "@polkadot/api";
import type { AxiosInstance } from "axios";
import { signatureVerify, sr25519Verify } from "@polkadot/util-crypto";
import { SignerPayloadJSON } from "@polkadot/types";
import { KeyringPair } from "@polkadot/keyring/types";
import {
  web3FromAddress,
} from "@polkadot/extension-dapp";
import {
  InjectedAccountWithMeta,
} from "@polkadot/extension-inject/types";

const RpcMap = {
  "vara": "wss://rpc.vara.network",
  "vara-testnet": "wss://testnet.vara.network",
};

const API = new Map();

async function useApi(network) {
  if (!API[network]) {
    const rpc = RpcMap[network];
    const provider = new WsProvider(rpc);
    API[network] = await ApiPromise.create({ provider });
  }
  return API[network];
}

async function createUnsignedTransaction(
  api,
  address,
  tx,
  options = {},
): SignerPayloadJSON {
  const {
    eraPeriod = 64,
    tip = 0,
  } = options;

  const lastHeader = await api.rpc.chain.getHeader();
  const blockHash = lastHeader.hash;
  const blockNumber = api.registry.createType(
    "BlockNumber",
    lastHeader.number.toNumber(),
  );
  const method = api.createType("Call", tx);

  const era = api.registry.createType("ExtrinsicEra", {
    current: lastHeader.number.toNumber(),
    period: eraPeriod,
  });

  const nonce = await api.rpc.system.accountNextIndex(address);

  const unsignedTransaction = {
    specVersion: api.runtimeVersion.specVersion.toHex(),
    transactionVersion: api.runtimeVersion.transactionVersion.toHex(),
    address: address,
    blockHash: blockHash.toHex(),
    blockNumber: blockNumber.toHex(),
    era: era.toHex(),
    genesisHash: api.genesisHash.toHex(),
    method: method.toHex(),
    nonce: nonce.toHex(),
    signedExtensions: api.registry.signedExtensions,
    tip: api.registry.createType("Compact<Balance>", tip).toHex(),
    version: tx.version,
  };

  return unsignedTransaction;
}

async function signWith(
  keypair: KeyringPair | InjectedAccountWithMeta,
  unsignedTransaction: SignerPayloadJSON,
  api: ApiPromise,
) {
  if ("meta" in keypair) {
    const injector = await web3FromAddress(keypair.address);
    return await injector.signer.signPayload(unsignedTransaction);
  } else {
    const rawUnsignedTransaction = api.registry.createType(
      "ExtrinsicPayload",
      unsignedTransaction,
      {
        version: unsignedTransaction.version,
      },
    );
    return rawUnsignedTransaction.sign(keypair);
  }
}

function withX402Interceptor(
  axiosClient: AxiosInstance,
  keypair: KeyringPair | InjectedAccountWithMeta,
) {
  axiosClient.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      if (error.response) {
        // Server responded with a status code outside 2xx
        // console.error( "Error Response:", error.response.status, error.response.data);

        if (error.response.status === 402) {
          let { accepts } = error.response.data;
          let { network, price, resource, payTo, facilitator } = accepts[0];
          let amount = Number(price.amount) * 1e12;
          let api = await useApi(network);
          const tx = api.tx.balances.transferKeepAlive(payTo, amount);
          const unsignedTransaction = await createUnsignedTransaction(
            api,
            keypair.address,
            tx,
          );
          const { signature } = await signWith(
            keypair,
            unsignedTransaction,
            api,
          );
          const data = {
            unsignedTransaction,
            signature,
            signer: keypair.address,
            network,
          };
          const paymentHeader = btoa(JSON.stringify(data));
          const originalConfig = error.config;
          originalConfig.headers["X-PAYMENT"] = paymentHeader;
          originalConfig.headers["Access-Control-Expose-Headers"] =
            "X-PAYMENT-RESPONSE";
          const secondResponse = await axiosClient.request(originalConfig);
          return secondResponse;
        }
      } else if (error.request) {
        // No response received
        console.error("No response from server:", error.request);
      } else {
        // Something went wrong setting up the request
        console.error("Axios setup error:", error.message);
      }

      // Always reject so the calling code can handle it
      return Promise.reject(error);
    },
  );
  return axiosClient;
}

export { createUnsignedTransaction, RpcMap, useApi, withX402Interceptor };
