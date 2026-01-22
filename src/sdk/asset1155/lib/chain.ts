import type { Chain } from "viem";
import { anvil, sepolia as viemSepolia } from "viem/chains";

export const certTestnet: Chain = {
  id: 123420001887,
  name: "Cert Testnet",
  nativeCurrency: {
    name: "CertCoin (Test)",
    symbol: "tCERT",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc.cert-testnet.t.raas.gelato.cloud"] },
    public: { http: ["https://rpc.cert-testnet.t.raas.gelato.cloud"] },
  },
};

export const localTestAnvil = anvil;

export const sepolia = viemSepolia;

