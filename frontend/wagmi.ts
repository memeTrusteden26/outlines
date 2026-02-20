import { createConfig, http } from "wagmi";
import { mainnet, sepolia, hardhat } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";

export const config = createConfig(
  getDefaultConfig({
    chains: [hardhat], // Add mainnet, sepolia for prod
    transports: {
      [hardhat.id]: http(),
    },
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
    appName: "LazyTask Marketplace",
  })
);
