const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying LazyTask Marketplace Contracts...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying with account: ${deployer.address}`);
  console.log(`💰 Account balance: ${(await ethers.provider.getBalance(deployer.address)).toString()}\n`);

  // ============================================
  // 1. Deploy BadgeNFT (no dependencies)
  // ============================================
  console.log("1️⃣ Deploying BadgeNFT...");
  const BadgeNFT = await ethers.getContractFactory("BadgeNFT");
  const badgeNFT = await BadgeNFT.deploy();
  await badgeNFT.waitForDeployment();
  const badgeNFTAddress = await badgeNFT.getAddress();
  console.log(`   ✅ BadgeNFT deployed at: ${badgeNFTAddress}`);

  // ============================================
  // 1.5 Deploy LizardToken (Lizard Lab)
  // ============================================
  console.log("\n1️⃣.5️⃣ Deploying LizardToken...");
  const LizardToken = await ethers.getContractFactory("LizardToken");
  const lizardToken = await LizardToken.deploy();
  await lizardToken.waitForDeployment();
  const lizardTokenAddress = await lizardToken.getAddress();
  console.log(`   ✅ LizardToken deployed at: ${lizardTokenAddress}`);

  // ============================================
  // 2. Deploy ReputationRegistry (needs BadgeNFT)
  // ============================================
  console.log("\n2️⃣ Deploying ReputationRegistry...");
  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const reputationRegistry = await ReputationRegistry.deploy();
  await reputationRegistry.waitForDeployment();
  const reputationRegistryAddress = await reputationRegistry.getAddress();
  console.log(`   ✅ ReputationRegistry deployed at: ${reputationRegistryAddress}`);

  // Set BadgeNFT in ReputationRegistry
  console.log("   🔗 Setting BadgeNFT in ReputationRegistry...");
  const setBadgeTx = await reputationRegistry.setBadgeNFT(badgeNFTAddress);
  await setBadgeTx.wait();
  console.log(`   ✅ BadgeNFT set in ReputationRegistry`);

  // Grant MINTER_ROLE to ReputationRegistry in BadgeNFT
  const MINTER_ROLE = await badgeNFT.MINTER_ROLE();
  await badgeNFT.grantRole(MINTER_ROLE, reputationRegistryAddress);
  console.log(`   ✅ Granted MINTER_ROLE to ReputationRegistry`);

  // Grant marketplace role to deployer for testing
  const MARKETPLACE_ROLE = await reputationRegistry.MARKETPLACE_ROLE();
  await reputationRegistry.grantRole(MARKETPLACE_ROLE, deployer.address);
  console.log(`   ✅ Granted MARKETPLACE_ROLE to deployer`);

  // ============================================
  // 3. Deploy RewardEngine (no dependencies)
  // ============================================
  console.log("\n3️⃣ Deploying RewardEngine...");
  const RewardEngine = await ethers.getContractFactory("RewardEngine");
  const rewardEngine = await RewardEngine.deploy();
  await rewardEngine.waitForDeployment();
  const rewardEngineAddress = await rewardEngine.getAddress();
  console.log(`   ✅ RewardEngine deployed at: ${rewardEngineAddress}`);

  // Grant marketplace role
  const marketplaceRole = await rewardEngine.MARKETPLACE_ROLE();
  await rewardEngine.grantRole(marketplaceRole, deployer.address);
  console.log(`   ✅ Granted MARKETPLACE_ROLE to deployer`);

  // ============================================
  // 4. Deploy LazyTaskMarketplace (depends on ReputationRegistry & RewardEngine)
  // ============================================
  console.log("\n4️⃣ Deploying LazyTaskMarketplace...");
  const LazyTaskMarketplace = await ethers.getContractFactory("LazyTaskMarketplace");
  const lazyTaskMarketplace = await LazyTaskMarketplace.deploy(reputationRegistryAddress, rewardEngineAddress);
  await lazyTaskMarketplace.waitForDeployment();
  const lazyTaskMarketplaceAddress = await lazyTaskMarketplace.getAddress();
  console.log(`   ✅ LazyTaskMarketplace deployed at: ${lazyTaskMarketplaceAddress}`);

  // Grant roles in LazyTaskMarketplace
  const ORACLE_ROLE = await lazyTaskMarketplace.ORACLE_ROLE();
  const ARBITRATOR_ROLE = await lazyTaskMarketplace.ARBITRATOR_ROLE();
  await lazyTaskMarketplace.grantRole(ORACLE_ROLE, deployer.address);
  await lazyTaskMarketplace.grantRole(ARBITRATOR_ROLE, deployer.address);
  console.log(`   ✅ Granted ORACLE_ROLE and ARBITRATOR_ROLE to deployer`);

  // Grant MARKETPLACE_ROLE to LazyTaskMarketplace in ReputationRegistry & RewardEngine
  console.log("   🔗 Granting MARKETPLACE_ROLE to LazyTaskMarketplace...");
  await reputationRegistry.grantRole(MARKETPLACE_ROLE, lazyTaskMarketplaceAddress);
  await rewardEngine.grantRole(marketplaceRole, lazyTaskMarketplaceAddress);
  console.log(`   ✅ Granted MARKETPLACE_ROLE to LazyTaskMarketplace in both registries`);

  // ============================================
  // 4.5 Deploy LizardLounge
  // ============================================
  console.log("\n4️⃣.5️⃣ Deploying LizardLounge...");
  const LizardLounge = await ethers.getContractFactory("LizardLounge");
  const lizardLounge = await LizardLounge.deploy(reputationRegistryAddress, lizardTokenAddress);
  await lizardLounge.waitForDeployment();
  const lizardLoungeAddress = await lizardLounge.getAddress();
  console.log(`   ✅ LizardLounge deployed at: ${lizardLoungeAddress}`);

  // Grant SKILL_REGISTRY_ROLE to LizardLounge in ReputationRegistry
  const SKILL_REGISTRY_ROLE = await reputationRegistry.SKILL_REGISTRY_ROLE();
  await reputationRegistry.grantRole(SKILL_REGISTRY_ROLE, lizardLoungeAddress);
  console.log(`   ✅ Granted SKILL_REGISTRY_ROLE to LizardLounge`);


  // ============================================
  // 5. Deploy ArbitratorGovernance
  // ============================================
  console.log("\n5️⃣ Deploying ArbitratorGovernance...");
  const ArbitratorGovernance = await ethers.getContractFactory("ArbitratorGovernance");
  // ArbitratorGovernance(address _token, address _marketplace)
  const arbitratorGovernance = await ArbitratorGovernance.deploy(rewardEngineAddress, lazyTaskMarketplaceAddress);
  await arbitratorGovernance.waitForDeployment();
  const arbitratorGovernanceAddress = await arbitratorGovernance.getAddress();
  console.log(`   ✅ ArbitratorGovernance deployed at: ${arbitratorGovernanceAddress}`);

  // Grant ARBITRATOR_ADMIN_ROLE to governance contract
  const ARBITRATOR_ADMIN_ROLE = await lazyTaskMarketplace.ARBITRATOR_ADMIN_ROLE();
  await lazyTaskMarketplace.grantRole(ARBITRATOR_ADMIN_ROLE, arbitratorGovernanceAddress);
  console.log(`   ✅ Granted ARBITRATOR_ADMIN_ROLE to ArbitratorGovernance`);

  // ============================================
  // 6. Deploy AgentSubscription (standalone)
  // ============================================
  console.log("\n6️⃣ Deploying AgentSubscription...");
  const AgentSubscription = await ethers.getContractFactory("AgentSubscription");
  const agentSubscription = await AgentSubscription.deploy();
  await agentSubscription.waitForDeployment();
  const agentSubscriptionAddress = await agentSubscription.getAddress();
  console.log(`   ✅ AgentSubscription deployed at: ${agentSubscriptionAddress}`);

  // ============================================
  // 7. Deploy AgenticOperation (standalone)
  // ============================================
  console.log("\n7️⃣ Deploying AgenticOperation...");
  const AgenticOperation = await ethers.getContractFactory("AgenticOperation");
  const agenticOperation = await AgenticOperation.deploy();
  await agenticOperation.waitForDeployment();
  const agenticOperationAddress = await agenticOperation.getAddress();
  console.log(`   ✅ AgenticOperation deployed at: ${agenticOperationAddress}`);

  // ============================================
  // 8. Deploy PerRequestPayment (standalone)
  // ============================================
  console.log("\n8️⃣ Deploying PerRequestPayment...");
  const PerRequestPayment = await ethers.getContractFactory("PerRequestPayment");
  const perRequestPayment = await PerRequestPayment.deploy();
  await perRequestPayment.waitForDeployment();
  const perRequestPaymentAddress = await perRequestPayment.getAddress();
  console.log(`   ✅ PerRequestPayment deployed at: ${perRequestPaymentAddress}`);

  // ============================================
  // Summary
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`BadgeNFT:             ${badgeNFTAddress}`);
  console.log(`LizardToken:          ${lizardTokenAddress}`);
  console.log(`ReputationRegistry:   ${reputationRegistryAddress}`);
  console.log(`RewardEngine:         ${rewardEngineAddress}`);
  console.log(`LazyTaskMarketplace:  ${lazyTaskMarketplaceAddress}`);
  console.log(`LizardLounge:         ${lizardLoungeAddress}`);
  console.log(`ArbitratorGovernance: ${arbitratorGovernanceAddress}`);
  console.log(`AgentSubscription:    ${agentSubscriptionAddress}`);
  console.log(`AgenticOperation:     ${agenticOperationAddress}`);
  console.log(`PerRequestPayment:    ${perRequestPaymentAddress}`);
  console.log("=".repeat(60));

  // Save addresses to a file for frontend usage
  const addresses = {
    BadgeNFT: badgeNFTAddress,
    LizardToken: lizardTokenAddress,
    ReputationRegistry: reputationRegistryAddress,
    RewardEngine: rewardEngineAddress,
    LazyTaskMarketplace: lazyTaskMarketplaceAddress,
    LizardLounge: lizardLoungeAddress,
    ArbitratorGovernance: arbitratorGovernanceAddress,
    AgentSubscription: agentSubscriptionAddress,
    AgenticOperation: agenticOperationAddress,
    PerRequestPayment: perRequestPaymentAddress,
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    "./deployments.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("\n💾 Addresses saved to deployments.json");

  console.log("\n✅ All contracts deployed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed!");
    console.error(error);
    process.exit(1);
  });
