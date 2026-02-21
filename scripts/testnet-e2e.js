const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("=== Starting Testnet End-to-End Test ===\n");

    // Load deployments
    const DEPLOYMENTS_PATH = path.join(__dirname, '../deployments.json');
    if (!fs.existsSync(DEPLOYMENTS_PATH)) {
        throw new Error("deployments.json not found. Run 'npx hardhat run scripts/deploy.js' first.");
    }
    const deployments = JSON.parse(fs.readFileSync(DEPLOYMENTS_PATH, 'utf8'));
    console.log(`Loaded deployments from ${deployments.network} network.`);

    // Setup Signers
    const signers = await ethers.getSigners();
    const customer = signers[0];
    // If we have a second signer, use it as worker. Otherwise reuse customer.
    const worker = signers.length > 1 ? signers[1] : signers[0];
    // Agent needs ORACLE_ROLE. In deploy script, deployer (signers[0]) gets it.
    const agent = signers[0];

    console.log(`Customer: ${customer.address}`);
    console.log(`Worker:   ${worker.address}`);
    console.log(`Agent:    ${agent.address}`);

    // Connect to Contracts
    const Marketplace = await ethers.getContractFactory("LazyTaskMarketplace");
    const marketplace = Marketplace.attach(deployments.LazyTaskMarketplace);

    const RewardEngine = await ethers.getContractFactory("RewardEngine");
    const rewardEngine = RewardEngine.attach(deployments.RewardEngine);

    const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
    const reputationRegistry = ReputationRegistry.attach(deployments.ReputationRegistry);

    // 1. Post Job
    console.log("\n1. Posting Job...");
    const jobType = "Testnet Coffee";
    const bounty = ethers.parseEther("0.001"); // Small amount for testnet
    const bond = ethers.parseEther("0.0001");

    const txPost = await marketplace.connect(customer).postJob(jobType, bond, { value: bounty });
    console.log(`   Tx sent: ${txPost.hash}`);
    const receiptPost = await txPost.wait();

    // Parse logs to find JobId
    let jobId;
    for (const log of receiptPost.logs) {
        try {
            const parsed = marketplace.interface.parseLog(log);
            if (parsed && parsed.name === 'JobPosted') {
                jobId = parsed.args.jobId;
                break;
            }
        } catch (e) {}
    }

    if (jobId === undefined) {
        throw new Error("JobPosted event not found");
    }
    console.log(`   ✅ Job Posted! ID: ${jobId}`);

    // 2. Accept Job
    console.log("\n2. Accepting Job...");
    // Ensure worker isn't customer if possible, but contract allows it.
    // Ensure worker has bond amount.
    const txAccept = await marketplace.connect(worker).acceptJob(jobId, { value: bond });
    console.log(`   Tx sent: ${txAccept.hash}`);
    await txAccept.wait();
    console.log(`   ✅ Job Accepted by ${worker.address}`);

    // 3. Submit Evidence
    console.log("\n3. Submitting Evidence...");
    const evidenceHash = "ipfs://testnet-evidence-hash";
    const txEvidence = await marketplace.connect(worker).submitEvidence(jobId, evidenceHash);
    console.log(`   Tx sent: ${txEvidence.hash}`);
    await txEvidence.wait();
    console.log(`   ✅ Evidence Submitted`);

    // 4. Verify & Complete Job (Agent)
    console.log("\n4. Verifying and Completing Job...");
    // Agent must have ORACLE_ROLE.
    const hasRole = await marketplace.hasRole(await marketplace.ORACLE_ROLE(), agent.address);
    if (!hasRole) {
        console.warn("⚠️ Agent does not have ORACLE_ROLE. Attempting to grant (will fail if not admin)...");
        try {
            await marketplace.connect(signers[0]).grantRole(await marketplace.ORACLE_ROLE(), agent.address);
        } catch (e) {
            console.error("   Could not grant role. Verification might fail.");
        }
    }

    const rating = 5;
    const txComplete = await marketplace.connect(agent).completeJob(jobId, rating);
    console.log(`   Tx sent: ${txComplete.hash}`);
    await txComplete.wait();
    console.log(`   ✅ Job Completed with rating ${rating}`);

    // 5. Check Results
    console.log("\n5. Checking Results...");

    // Check Job Status
    const job = await marketplace.jobs(jobId);
    console.log(`   Job Status: ${job.status} (2 = Completed)`);
    if (job.status !== 2n) throw new Error("Job status is not Completed");

    // Check Reputation
    const score = await reputationRegistry.reputationScores(worker.address);
    console.log(`   Worker Reputation Score: ${score}`);

    // Check Rewards
    const balance = await rewardEngine.balanceOf(worker.address);
    console.log(`   Worker Reward Balance: ${ethers.formatEther(balance)} LAZY`);

    console.log("\n=== Testnet E2E Test Passed! ===");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
