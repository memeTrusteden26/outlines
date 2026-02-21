const { deployContracts } = require("./agent-skills/utils");
const { postJob } = require("./agent-skills/postJob");
const { verifyJob } = require("./agent-skills/verifyJob");
const { acceptJob, submitEvidence } = require("./agent-skills/workerActions");
const { ethers } = require("hardhat");

// --- Mock AI Parsing Logic ---
// In a real system, this would be an LLM call.
function parseLazyMessage(message) {
    console.log(`\n🤖 Agent Analysis: Parsing message "${message}"...`);

    const lowerMsg = message.toLowerCase();

    // Simple regex/keyword matching for demo purposes
    if (lowerMsg.includes("coffee")) {
        // Extract amount if present (e.g. "$500") -> convert to ETH for simplicity
        // Let's assume $500 -> 0.2 ETH for demo
        return {
            jobType: "Get valid_coffee",
            bond: "0.1", // 0.1 ETH bond
            bounty: "0.2", // 0.2 ETH bounty
            description: "Delivery of one hot coffee"
        };
    } else if (lowerMsg.includes("pizza")) {
        return {
            jobType: "Get valid_pizza",
            bond: "0.05",
            bounty: "0.15",
            description: "Delivery of a fresh pizza"
        };
    }

    return null;
}

async function main() {
    console.log("=== 🚀 Starting LazyTask Demo Flow ===");
    console.log("Scenario: Lazy Message -> Agent Post -> Worker Accept -> Agent Verify\n");

    const [deployer, customer, worker, agent] = await ethers.getSigners();

    // 1. Setup Environment
    console.log("--- Step 1: Deploying Contracts ---");
    const { marketplace, registry, rewardEngine, badgeNFT } = await deployContracts();

    // Grant ORACLE_ROLE to agent for verification later
    const ORACLE_ROLE = await marketplace.ORACLE_ROLE();
    await marketplace.grantRole(ORACLE_ROLE, agent.address);
    console.log(`Granted ORACLE_ROLE to Agent: ${agent.address}`);


    // 2. Customer sends a "Lazy Message"
    console.log("\n--- Step 2: Customer Interaction ---");
    const userMessage = "I'm super lazy, can someone get me a coffee? I'll pay well.";
    console.log(`Customer (${customer.address}) says: "${userMessage}"`);

    // 3. Agent parses the message
    const parsedJob = parseLazyMessage(userMessage);
    if (!parsedJob) {
        console.error("Agent failed to parse message.");
        return;
    }
    console.log(`Agent determined job details:`, parsedJob);

    // 4. Agent posts the job on behalf of the customer (or customer signs it)
    // Here we assume the agent facilitates the transaction for the customer
    console.log("\n--- Step 3: Posting Job ---");
    const jobId = await postJob(
        marketplace,
        parsedJob.jobType,
        parsedJob.bond,
        parsedJob.bounty,
        customer
    );

    if (jobId === null) {
        console.error("Failed to post job.");
        return;
    }

    // 5. Worker accepts the job
    console.log("\n--- Step 4: Worker Accepts Job ---");
    // Worker needs to approve bond? No, just send ETH with acceptJob.
    // Ensure worker has enough ETH (hardhat accounts have 10000 ETH)
    await acceptJob(marketplace, jobId, parsedJob.bond, worker);

    // 6. Worker performs task and submits evidence
    console.log("\n--- Step 5: Worker Submits Evidence ---");
    // Simulating off-chain image upload -> IPFS hash
    const evidenceUrl = "http://ipfs/valid_coffee_proof.jpg";
    await submitEvidence(jobId, evidenceUrl, worker);
    // On-chain submission
    await marketplace.connect(worker).submitEvidence(jobId, evidenceUrl);
    console.log(`Worker submitted evidence on-chain: ${evidenceUrl}`);

    // 7. Agent verifies the evidence
    console.log("\n--- Step 6: Agent Verification ---");
    await verifyJob(marketplace, jobId, evidenceUrl, agent);

    // 8. Final Checks (Rewards & Badges)
    console.log("\n--- Step 7: Final State Verification ---");

    // Check Reward Balance
    const balance = await rewardEngine.balanceOf(worker.address);
    console.log(`Worker Reward Balance: ${ethers.formatEther(balance)} LAZY`);

    // Check Reputation Score
    const score = await registry.reputationScores(worker.address);
    console.log(`Worker Reputation Score: ${score}`);

    // Check Badges
    // Worker completed 1 job, should have Badge Type 1
    const badgeBalance = await badgeNFT.balanceOf(worker.address);
    console.log(`Worker Badge Count: ${badgeBalance}`);

    if (badgeBalance > 0) {
        // Get token ID (assuming 0 for first badge)
        // ERC721Enumerable is not used, so we can't easily get token by index without it.
        // But since it's a test env, we can guess tokenId 0.
        // Or we can check logs.
        // Let's just trust balance > 0 for now.
        console.log("✅ Worker received a badge!");
    } else {
        console.log("❌ Worker did not receive a badge.");
    }

    console.log("\n=== Demo Complete ===");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
