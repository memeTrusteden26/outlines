const { ethers } = require("hardhat");

async function getContract(contractName, address = null) {
    if (address) {
        return await ethers.getContractAt(contractName, address);
    }
    // If no address, assume we are deploying or getting the first deployment in hardhat node context
    // For simplicity in scripts, we might deploy fresh or rely on a known address.
    // Here we'll just return a factory for deployment if address is null.
    const Factory = await ethers.getContractFactory(contractName);
    return Factory;
}

async function deployContracts() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
    const registry = await ReputationRegistry.deploy();
    await registry.waitForDeployment(); // Updated for newer ethers

    const RewardEngine = await ethers.getContractFactory("RewardEngine");
    const rewardEngine = await RewardEngine.deploy();
    await rewardEngine.waitForDeployment();

    const BadgeNFT = await ethers.getContractFactory("BadgeNFT");
    const badgeNFT = await BadgeNFT.deploy();
    await badgeNFT.waitForDeployment();

    const LazyTaskMarketplace = await ethers.getContractFactory("LazyTaskMarketplace");
    const marketplace = await LazyTaskMarketplace.deploy(await registry.getAddress(), await rewardEngine.getAddress());
    await marketplace.waitForDeployment();

    const MARKETPLACE_ROLE = await registry.MARKETPLACE_ROLE();
    await registry.grantRole(MARKETPLACE_ROLE, await marketplace.getAddress());
    await rewardEngine.grantRole(MARKETPLACE_ROLE, await marketplace.getAddress());

    // Setup Badges
    const MINTER_ROLE = await badgeNFT.MINTER_ROLE();
    await badgeNFT.grantRole(MINTER_ROLE, await registry.getAddress());
    await registry.setBadgeNFT(await badgeNFT.getAddress());

    console.log("Contracts deployed:");
    console.log("Registry:", await registry.getAddress());
    console.log("RewardEngine:", await rewardEngine.getAddress());
    console.log("BadgeNFT:", await badgeNFT.getAddress());
    console.log("Marketplace:", await marketplace.getAddress());

    return { registry, rewardEngine, marketplace, badgeNFT };
}

module.exports = { getContract, deployContracts };
