const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment for frontend...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy ReputationRegistry
  const ReputationRegistry = await hre.ethers.getContractFactory("ReputationRegistry");
  const reputationRegistry = await ReputationRegistry.deploy();
  await reputationRegistry.waitForDeployment();
  const reputationRegistryAddress = await reputationRegistry.getAddress();
  console.log("ReputationRegistry deployed to:", reputationRegistryAddress);

  // 2. Deploy RewardEngine
  const RewardEngine = await hre.ethers.getContractFactory("RewardEngine");
  const rewardEngine = await RewardEngine.deploy();
  await rewardEngine.waitForDeployment();
  const rewardEngineAddress = await rewardEngine.getAddress();
  console.log("RewardEngine deployed to:", rewardEngineAddress);

  // 3. Deploy LazyTaskMarketplace
  const LazyTaskMarketplace = await hre.ethers.getContractFactory("LazyTaskMarketplace");
  const lazyTaskMarketplace = await LazyTaskMarketplace.deploy(
    reputationRegistryAddress,
    rewardEngineAddress
  );
  await lazyTaskMarketplace.waitForDeployment();
  const lazyTaskMarketplaceAddress = await lazyTaskMarketplace.getAddress();
  console.log("LazyTaskMarketplace deployed to:", lazyTaskMarketplaceAddress);

  // 4. Grant Roles
  const MARKETPLACE_ROLE = await reputationRegistry.MARKETPLACE_ROLE();
  await reputationRegistry.grantRole(MARKETPLACE_ROLE, lazyTaskMarketplaceAddress);
  await rewardEngine.grantRole(MARKETPLACE_ROLE, lazyTaskMarketplaceAddress);
  console.log("Granted MARKETPLACE_ROLE to LazyTaskMarketplace");

  // 5. Generate Config
  const reputationRegistryArtifact = await hre.artifacts.readArtifact("ReputationRegistry");
  const rewardEngineArtifact = await hre.artifacts.readArtifact("RewardEngine");
  const lazyTaskMarketplaceArtifact = await hre.artifacts.readArtifact("LazyTaskMarketplace");

  const configContent = `
export const LAZY_TASK_MARKETPLACE_ADDRESS = "${lazyTaskMarketplaceAddress}";
export const LAZY_TASK_MARKETPLACE_ABI = ${JSON.stringify(lazyTaskMarketplaceArtifact.abi, null, 2)} as const;

export const REPUTATION_REGISTRY_ADDRESS = "${reputationRegistryAddress}";
export const REPUTATION_REGISTRY_ABI = ${JSON.stringify(reputationRegistryArtifact.abi, null, 2)} as const;

export const REWARD_ENGINE_ADDRESS = "${rewardEngineAddress}";
export const REWARD_ENGINE_ABI = ${JSON.stringify(rewardEngineArtifact.abi, null, 2)} as const;
`;

  const configPath = path.join(__dirname, "../frontend/config/contracts.ts");
  fs.writeFileSync(configPath, configContent);
  console.log("Updated frontend config at:", configPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
