const { ethers } = require("hardhat");
const { deployContracts } = require("./agent-skills/utils");

async function main() {
    console.log("=== Testing Badge NFT Milestones ===\n");
    const [deployer, customer, worker, other] = await ethers.getSigners();
    const { marketplace, registry, rewardEngine, badgeNFT } = await deployContracts();

    const bond = ethers.parseEther("0.1");
    const bounty = ethers.parseEther("1.0");

    console.log("\n--- Milestone 1: First Job ---");
    // Job 0
    await marketplace.connect(customer).postJob("Task 1", bond, { value: bounty });
    await marketplace.connect(worker).acceptJob(0, { value: bond });
    await marketplace.connect(customer).completeJob(0, 5);

    // Check Badge 1
    const balance1 = await badgeNFT.balanceOf(worker.address);
    console.log(`Worker Badge Balance: ${balance1}`);

    if (balance1 == 1n) {
        // Find token ID by index (simplified, assuming first token is 0)
        // Since we are using an incrementing ID in BadgeNFT, and this is the first one minted globally...
        // Let's iterate or assume logic.
        // Or check event?
        // Let's just check owner of tokenId 0
        const owner0 = await badgeNFT.ownerOf(0);
        const type0 = await badgeNFT.badgeTypes(0);
        console.log(`Token 0 Owner: ${owner0}, Type: ${type0}`);

        if (owner0 === worker.address && type0 == 1n) {
            console.log("SUCCESS: 'First Step' badge minted.");
        } else {
            console.error("FAILURE: Incorrect owner or badge type.");
        }
    } else {
        console.error("FAILURE: Badge not minted.");
    }

    console.log("\n--- Milestone 2: 5 Jobs ---");
    // Complete 4 more jobs
    for (let i = 1; i < 5; i++) {
        await marketplace.connect(customer).postJob(`Task ${i+1}`, bond, { value: bounty });
        await marketplace.connect(worker).acceptJob(i, { value: bond });
        await marketplace.connect(customer).completeJob(i, 5);
    }

    const balance5 = await badgeNFT.balanceOf(worker.address);
    console.log(`Worker Badge Balance: ${balance5}`);

    // Should have 2 badges now (Type 1 and Type 2)
    // The second badge should be tokenId 1
    if (balance5 == 2n) {
        const type1 = await badgeNFT.badgeTypes(1);
        console.log(`Token 1 Type: ${type1}`);
        if (type1 == 2n) {
            console.log("SUCCESS: 'Reliable Worker' badge minted.");
        } else {
             console.error("FAILURE: Incorrect badge type for milestone 5.");
        }
    } else {
        console.error(`FAILURE: Expected 2 badges, got ${balance5}`);
    }

    console.log("\n--- Testing Soulbound Property ---");
    try {
        await badgeNFT.connect(worker).transferFrom(worker.address, other.address, 0);
        console.error("FAILURE: Transfer succeeded (should have failed).");
    } catch (error) {
        if (error.message.includes("Soulbound")) {
            console.log("SUCCESS: Transfer failed with 'Soulbound' error.");
        } else {
            console.log(`SUCCESS: Transfer failed with error: ${error.message}`);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
