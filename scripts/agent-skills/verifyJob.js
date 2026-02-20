const { ethers } = require("hardhat");

async function verifyJob(marketplace, jobId, evidenceUrl, signer) {
    console.log(`\nAgent Verifying Job ${jobId} with evidence: ${evidenceUrl}`);

    // Mock AI Vision Logic
    // In a real agent, this would call OpenAI/Claude with the image URL
    // Here we simulate it:
    let isVerified = false;
    let rating = 0;

    if (evidenceUrl.includes("valid_coffee")) {
        console.log("AI Vision Analysis: Verified! Looks like a cup of coffee.");
        isVerified = true;
        rating = 5;
    } else if (evidenceUrl.includes("valid_pizza")) {
        console.log("AI Vision Analysis: Verified! Looks like pizza.");
        isVerified = true;
        rating = 4;
    } else {
        console.log("AI Vision Analysis: Rejected. Evidence unclear or invalid.");
        isVerified = false;
        rating = 1;
    }

    if (isVerified) {
        console.log("Agent Calling completeJob...");
        try {
            const tx = await marketplace.connect(signer).completeJob(jobId, rating);
            await tx.wait();
            console.log(`Job ${jobId} completed with rating ${rating}. Bounty + Bond released.`);
        } catch (error) {
            console.error("Error completing job:", error.message);
        }
    } else {
        console.log("Agent rejected job. (In MVP, maybe dispute or just don't verify).");
        // Could call resolveDispute if implemented as an Oracle or dispute flow
    }
}

module.exports = { verifyJob };
