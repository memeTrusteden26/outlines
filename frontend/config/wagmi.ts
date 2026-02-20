import { createConfig, http } from "wagmi";
import { hardhat } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";

export const config = createConfig(
  getDefaultConfig({
    // Your dApps chains
    chains: [hardhat],
    transports: {
      // RPC URL for each chain
      [hardhat.id]: http(),
    },

    // Required API Keys
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",

    // Required App Info
    appName: "LazyTask Marketplace",

    // Optional App Info
    appDescription: "Your App Description",
    appUrl: "https://family.co", // your app's url
    appIcon: "https://family.co/logo.png", // your app's icon, no bigger than 1024x1024px (max. 1MB)
  }),
);
