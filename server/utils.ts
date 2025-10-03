import { ApiPromise, WsProvider } from "@polkadot/api";
import { SignerPayloadJSON } from "@polkadot/types";
import { z } from "zod";

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

async function sendAndWaitForFinalization(tx) {
  return new Promise(async (resolve, reject) => {
    const txHash = tx.hash.toHex();

    const unsub = await tx.send(({ status, events }) => {
      if (status.isFinalized) {
        let success = false;
        let message: string | null = null;

        for (const { event } of events) {
          const { section, method, data } = event;

          if (section === "system") {
            if (method === "ExtrinsicSuccess") {
              success = true;
              message = "Extrinsic executed successfully";
              break;
            } else if (method === "ExtrinsicFailed") {
              success = false;
              const [dispatchError] = data.toJSON();

              if (dispatchError?.Module) {
                const { index, error } = dispatchError.Module;
                message = `Module error: index ${index}, error ${error}`;
              } else if (dispatchError?.token) {
                message = `Dispatch error: ${JSON.stringify(dispatchError)}`;
              } else {
                message = `Dispatch error: ${dispatchError}`;
              }

              break;
            }
          }
        }

        unsub();
        resolve({
          txHash,
          success,
          message,
          blockHash: status.asFinalized.toHex(),
        });
      }
    }).catch(reject);
  });
}

const PaymentDataSchema = z.object({
  unsignedTransaction: z.any(),
  signature: z.string(),
  signer: z.string(),
  network: z.enum(["vara", "vara-testnet"]),
});

interface PaymentData {
  unsignedTransaction: SignedPayloadJSON;
  signature: string;
  signer: string;
  network: "vara" | "vara-testnet";
}

function decodePaymentHeader(x: string): PaymentData {
  if (!x) return null;

  const decoded = atob(x);
  const parsed = JSON.parse(decoded);
  const data = PaymentDataSchema.parse(parsed);

  return data as PaymentData;
}

export {
  decodePaymentHeader,
  PaymentData,
  RpcMap,
  sendAndWaitForFinalization,
  useApi,
};
