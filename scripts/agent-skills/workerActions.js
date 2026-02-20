const { ethers } = require("hardhat");

async function acceptJob(marketplace, jobId, bondAmountEth, signer) {
    console.log(`\nWorker accepting Job ${jobId} with bond ${bondAmountEth} ETH`);
    const bond = ethers.parseEther(bondAmountEth);
    const tx = await marketplace.connect(signer).acceptJob(jobId, { value: bond });
    await tx.wait();
    console.log(`Job ${jobId} accepted by worker: ${signer.address}`);
}

async function submitEvidence(jobId, evidenceUrl, signer) {
    // This is typically off-chain to the agent (e.g. Telegram chat)
    // But for simulation, we just print the action.
    // In a real flow, this might also trigger an on-chain event if using ReputationRegistry for evidence storage.
    // Or we can mock the "disputeJob" call if we want to store evidence hash on-chain.
    // Here we'll just log it as a simulation step.
    console.log(`\nWorker submitting evidence: ${evidenceUrl} (Sent to Agent Chat)`);
    return evidenceUrl;
}

module.exports = { acceptJob, submitEvidence };
