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

  // 3. Deploy BadgeNFT
  const BadgeNFT = await hre.ethers.getContractFactory("BadgeNFT");
  const badgeNFT = await BadgeNFT.deploy();
  await badgeNFT.waitForDeployment();
  const badgeNFTAddress = await badgeNFT.getAddress();
  console.log("BadgeNFT deployed to:", badgeNFTAddress);

  // 3.5 Deploy LizardToken (Lizard Lab)
  const LizardToken = await hre.ethers.getContractFactory("LizardToken");
  const lizardToken = await LizardToken.deploy();
  await lizardToken.waitForDeployment();
  const lizardTokenAddress = await lizardToken.getAddress();
  console.log("LizardToken deployed to:", lizardTokenAddress);

  // 4. Deploy LazyTaskMarketplace
  const LazyTaskMarketplace = await hre.ethers.getContractFactory("LazyTaskMarketplace");
  const lazyTaskMarketplace = await LazyTaskMarketplace.deploy(
    reputationRegistryAddress,
    rewardEngineAddress
  );
  await lazyTaskMarketplace.waitForDeployment();
  const lazyTaskMarketplaceAddress = await lazyTaskMarketplace.getAddress();
  console.log("LazyTaskMarketplace deployed to:", lazyTaskMarketplaceAddress);

  // 5. Deploy LizardLounge
  const LizardLounge = await hre.ethers.getContractFactory("LizardLounge");
  // Updated constructor: (ReputationRegistry, Marketplace, LizardToken)
  const lizardLounge = await LizardLounge.deploy(
    reputationRegistryAddress,
    lazyTaskMarketplaceAddress,
    lizardTokenAddress
  );
  await lizardLounge.waitForDeployment();
  const lizardLoungeAddress = await lizardLounge.getAddress();
  console.log("LizardLounge deployed to:", lizardLoungeAddress);

  // 6. Grant Roles & Setup
  const MARKETPLACE_ROLE = await reputationRegistry.MARKETPLACE_ROLE();
  await reputationRegistry.grantRole(MARKETPLACE_ROLE, lazyTaskMarketplaceAddress);
  await rewardEngine.grantRole(MARKETPLACE_ROLE, lazyTaskMarketplaceAddress);

  const MINTER_ROLE = await badgeNFT.MINTER_ROLE();
  await badgeNFT.grantRole(MINTER_ROLE, reputationRegistryAddress);
  await reputationRegistry.setBadgeNFT(badgeNFTAddress);

  const SKILL_REGISTRY_ROLE = await reputationRegistry.SKILL_REGISTRY_ROLE();
  await reputationRegistry.grantRole(SKILL_REGISTRY_ROLE, lizardLoungeAddress);

  console.log("Roles and BadgeNFT setup complete.");

  // 7. Generate Config
  const reputationRegistryArtifact = await hre.artifacts.readArtifact("ReputationRegistry");
  const rewardEngineArtifact = await hre.artifacts.readArtifact("RewardEngine");
  const lazyTaskMarketplaceArtifact = await hre.artifacts.readArtifact("LazyTaskMarketplace");
  const badgeNFTArtifact = await hre.artifacts.readArtifact("BadgeNFT");
  const lizardLoungeArtifact = await hre.artifacts.readArtifact("LizardLounge");
  const lizardTokenArtifact = await hre.artifacts.readArtifact("LizardToken");

  const configContent = `
export const LAZY_TASK_MARKETPLACE_ADDRESS = "${lazyTaskMarketplaceAddress}";
export const LAZY_TASK_MARKETPLACE_ABI = ${JSON.stringify(lazyTaskMarketplaceArtifact.abi, null, 2)} as const;

export const REPUTATION_REGISTRY_ADDRESS = "${reputationRegistryAddress}";
export const REPUTATION_REGISTRY_ABI = ${JSON.stringify(reputationRegistryArtifact.abi, null, 2)} as const;

export const REWARD_ENGINE_ADDRESS = "${rewardEngineAddress}";
export const REWARD_ENGINE_ABI = ${JSON.stringify(rewardEngineArtifact.abi, null, 2)} as const;

export const BADGE_NFT_ADDRESS = "${badgeNFTAddress}";
export const BADGE_NFT_ABI = ${JSON.stringify(badgeNFTArtifact.abi, null, 2)} as const;

export const LIZARD_LOUNGE_ADDRESS = "${lizardLoungeAddress}";
export const LIZARD_LOUNGE_ABI = ${JSON.stringify(lizardLoungeArtifact.abi, null, 2)} as const;

export const LIZARD_TOKEN_ADDRESS = "${lizardTokenAddress}";
export const LIZARD_TOKEN_ABI = ${JSON.stringify(lizardTokenArtifact.abi, null, 2)} as const;
`;

  const configPath = path.join(__dirname, "../frontend/config/contracts.ts");
  fs.writeFileSync(configPath, configContent);
  console.log("Updated frontend config at:", configPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
