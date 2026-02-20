const { deployContracts } = require("./agent-skills/utils");
const { postJob } = require("./agent-skills/postJob");
const { verifyJob } = require("./agent-skills/verifyJob");
const { acceptJob, submitEvidence } = require("./agent-skills/workerActions");
const { ethers } = require("hardhat");

async function main() {
    console.log("=== Starting Agent Flow Simulation ===\n");

    const [deployer, customer, worker, agent] = await ethers.getSigners();

    // 1. Deploy & Setup
    const { marketplace, registry, rewardEngine } = await deployContracts();

    // 2. Customer Agent (simulated by customer account) posts a job
    const jobId = await postJob(marketplace, "Get valid_coffee", "0.1", "1.0", customer);

    // 3. Worker Accepts
    await acceptJob(marketplace, jobId, "0.1", worker);

    // 4. Worker Submits Evidence
    const evidence = await submitEvidence(jobId, "http://ipfs/valid_coffee.jpg", worker);

    // 5. Agent Verifies (simulated by agent account)
    // The "agent" here is just a script runner, but in real flow it's OpenClaw reacting to the message.
    // The contract logic allows the customer OR oracle to complete. Let's assume customer/agent uses their key.
    // In our contract, `completeJob` requires msg.sender == customer OR has ORACLE_ROLE.
    // Let's grant agent the ORACLE_ROLE to simulate an AI agent completing it.

    const ORACLE_ROLE = await marketplace.ORACLE_ROLE();
    await marketplace.grantRole(ORACLE_ROLE, agent.address);
    console.log(`Granted ORACLE_ROLE to agent: ${agent.address}`);

    await verifyJob(marketplace, jobId, evidence, agent);

    // 6. Check Worker Balance/Rewards
    const balance = await rewardEngine.balanceOf(worker.address);
    const score = await registry.reputationScores(worker.address);
    console.log(`\nWorker Final State:`);
    console.log(`LazyTokens: ${ethers.formatEther(balance)}`);
    console.log(`Reputation Score: ${score}`);

    console.log("\n=== Simulation Complete ===");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
