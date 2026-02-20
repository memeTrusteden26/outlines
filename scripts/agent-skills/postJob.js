const { ethers } = require("hardhat");

async function postJob(marketplace, jobType, bondAmountEth, bountyEth, signer) {
    console.log(`\nAgent posting job: "${jobType}" with bond: ${bondAmountEth} ETH and bounty: ${bountyEth} ETH`);

    const bond = ethers.parseEther(bondAmountEth);
    const bounty = ethers.parseEther(bountyEth);

    const tx = await marketplace.connect(signer).postJob(jobType, bond, { value: bounty });
    const receipt = await tx.wait();

    // Find JobPosted event
    const event = receipt.logs.find(log => {
        try {
            return marketplace.interface.parseLog(log).name === 'JobPosted';
        } catch (e) { return false; }
    });

    if (event) {
        const parsed = marketplace.interface.parseLog(event);
        console.log(`Job Posted! Job ID: ${parsed.args.jobId}`);
        return parsed.args.jobId;
    } else {
        console.log("Job posted but event not found (likely filter issue)");
        return null;
    }
}

module.exports = { postJob };
