const hre = require("hardhat");

async function main() {
  console.log("🦎 Deploying Lizard Lounge...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Deploy ReputationRegistry first (needed for Lounge)
  const ReputationRegistry = await hre.ethers.getContractFactory("ReputationRegistry");
  const reputationRegistry = await ReputationRegistry.deploy();
  await reputationRegistry.waitForDeployment();
  const reputationRegistryAddress = await reputationRegistry.getAddress();
  console.log("ReputationRegistry deployed:", reputationRegistryAddress);

  // Deploy RewardEngine (needed for Marketplace)
  const RewardEngine = await hre.ethers.getContractFactory("RewardEngine");
  const rewardEngine = await RewardEngine.deploy();
  await rewardEngine.waitForDeployment();
  const rewardEngineAddress = await rewardEngine.getAddress();
  console.log("RewardEngine deployed:", rewardEngineAddress);

  // Deploy Marketplace (needed for Lounge chat)
  const LazyTaskMarketplace = await hre.ethers.getContractFactory("LazyTaskMarketplace");
  const lazyTaskMarketplace = await LazyTaskMarketplace.deploy(reputationRegistryAddress, rewardEngineAddress);
  await lazyTaskMarketplace.waitForDeployment();
  const lazyTaskMarketplaceAddress = await lazyTaskMarketplace.getAddress();
  console.log("LazyTaskMarketplace deployed:", lazyTaskMarketplaceAddress);

  // Deploy LizardLounge
  const LizardLounge = await hre.ethers.getContractFactory("LizardLounge");
  const lizardLounge = await LizardLounge.deploy(reputationRegistryAddress, lazyTaskMarketplaceAddress);
  await lizardLounge.waitForDeployment();
  const lizardLoungeAddress = await lizardLounge.getAddress();
  console.log("LizardLounge deployed:", lizardLoungeAddress);

  // Grant SKILL_REGISTRY_ROLE
  const SKILL_REGISTRY_ROLE = await reputationRegistry.SKILL_REGISTRY_ROLE();
  await reputationRegistry.grantRole(SKILL_REGISTRY_ROLE, lizardLoungeAddress);
  console.log("Granted SKILL_REGISTRY_ROLE to LizardLounge");

  console.log("✅ Deployment complete");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
