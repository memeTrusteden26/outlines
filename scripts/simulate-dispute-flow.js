const { deployContracts } = require("./agent-skills/utils");
const { postJob } = require("./agent-skills/postJob");
const { acceptJob, submitEvidence } = require("./agent-skills/workerActions");
const { ethers } = require("hardhat");

async function main() {
    console.log("=== Starting Dispute Flow Simulation ===\n");

    const [deployer, customer, worker, agentVerifier, agentArbitrator] = await ethers.getSigners();

    // 1. Deploy & Setup
    const { marketplace, registry, rewardEngine } = await deployContracts();

    // Grant ARBITRATOR_ROLE to agentArbitrator
    const ARBITRATOR_ROLE = await marketplace.ARBITRATOR_ROLE();
    await marketplace.grantRole(ARBITRATOR_ROLE, agentArbitrator.address);
    console.log(`Granted ARBITRATOR_ROLE to agentArbitrator: ${agentArbitrator.address}`);

    // --- Scenario 1: Worker Wins Dispute ---
    console.log("\n--- Scenario 1: Worker Wins Dispute ---");

    // 2. Customer posts a job
    const jobId1 = await postJob(marketplace, "Complex Task 1", "0.1", "1.0", customer);

    // 3. Worker Accepts
    await acceptJob(marketplace, jobId1, "0.1", worker);

    // 4. Worker Submits Evidence
    const evidence1 = await submitEvidence(jobId1, "http://ipfs/proof_valid.jpg", worker);

    // 5. Agent Verifies (simulated failure/rejection)
    console.log(`Agent Verifier (${agentVerifier.address}) checks evidence... Result: REJECTED (simulated)`);
    // In a real scenario, the verifier would just NOT call completeJob, or might have a way to signal rejection.
    // Here we assume the worker sees the rejection (or timeout) and initiates a dispute.

    // 6. Worker Disputes
    console.log(`Worker (${worker.address}) initiates dispute for Job ${jobId1}`);
    await marketplace.connect(worker).disputeJob(jobId1, evidence1);

    // 7. Arbitrator Resolves (Worker Wins)
    console.log(`Agent Arbitrator (${agentArbitrator.address}) reviews dispute... Result: WORKER WINS`);
    await marketplace.connect(agentArbitrator).resolveDispute(jobId1, true, 5); // 5 star rating

    // Check balances
    const balance1 = await rewardEngine.balanceOf(worker.address);
    console.log(`Worker Reward Balance: ${ethers.formatEther(balance1)}`);


    // --- Scenario 2: Worker Loses Dispute ---
    console.log("\n--- Scenario 2: Worker Loses Dispute ---");

    // 8. Customer posts another job
    const jobId2 = await postJob(marketplace, "Complex Task 2", "0.1", "1.0", customer);

    // 9. Worker Accepts
    await acceptJob(marketplace, jobId2, "0.1", worker);

    // 10. Worker Submits Evidence (Fake)
    const evidence2 = await submitEvidence(jobId2, "http://ipfs/proof_fake.jpg", worker);

    // 11. Agent Verifies (simulated failure)
    console.log(`Agent Verifier (${agentVerifier.address}) checks evidence... Result: REJECTED (simulated)`);

    // 12. Worker Disputes
    console.log(`Worker (${worker.address}) initiates dispute for Job ${jobId2}`);
    await marketplace.connect(worker).disputeJob(jobId2, evidence2);

    // 13. Arbitrator Resolves (Worker Loses)
    console.log(`Agent Arbitrator (${agentArbitrator.address}) reviews dispute... Result: WORKER LOSES`);

    // Check bond balance before slashing (optional but good for debugging)

    await marketplace.connect(agentArbitrator).resolveDispute(jobId2, false, 0);

    // Check slashing
    // The worker should have lost their bond.
    // The reputation score should be impacted.
    const score = await registry.reputationScores(worker.address);
    console.log(`Worker Reputation Score: ${score}`);

    console.log("\n=== Simulation Complete ===");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
