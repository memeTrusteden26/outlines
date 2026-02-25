const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LazyTaskMarketplace", function () {
  let marketplace, registry, rewardEngine;
  let owner, customer, worker, other;
  let MARKETPLACE_ROLE;

  beforeEach(async function () {
    [owner, customer, worker, other] = await ethers.getSigners();

    // Deploy ReputationRegistry
    const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
    registry = await ReputationRegistry.deploy();

    // Deploy RewardEngine
    const RewardEngine = await ethers.getContractFactory("RewardEngine");
    rewardEngine = await RewardEngine.deploy();

    // Deploy Marketplace
    const LazyTaskMarketplace = await ethers.getContractFactory("LazyTaskMarketplace");
    marketplace = await LazyTaskMarketplace.deploy(await registry.getAddress(), await rewardEngine.getAddress());

    // Grant roles
    MARKETPLACE_ROLE = await registry.MARKETPLACE_ROLE();
    await registry.grantRole(MARKETPLACE_ROLE, await marketplace.getAddress());
    await rewardEngine.grantRole(MARKETPLACE_ROLE, await marketplace.getAddress());
  });

  it("Should allow posting a job", async function () {
    const bounty = ethers.parseEther("1.0");
    const bond = ethers.parseEther("0.1");

    await expect(marketplace.connect(customer).postJob("Get coffee", bond, { value: bounty }))
      .to.emit(marketplace, "JobPosted")
      .withArgs(0, customer.address, bounty, bond);

    const job = await marketplace.jobs(0);
    expect(job.customer).to.equal(customer.address);
    expect(job.bounty).to.equal(bounty);
    expect(job.workerBond).to.equal(bond);
    expect(job.status).to.equal(0); // Posted
  });

  it("Should allow accepting a job", async function () {
    const bounty = ethers.parseEther("1.0");
    const bond = ethers.parseEther("0.1");

    await marketplace.connect(customer).postJob("Get coffee", bond, { value: bounty });

    await expect(marketplace.connect(worker).acceptJob(0, { value: bond }))
      .to.emit(marketplace, "JobAccepted")
      .withArgs(0, worker.address);

    const job = await marketplace.jobs(0);
    expect(job.worker).to.equal(worker.address);
    expect(job.status).to.equal(1); // Accepted
  });

  it("Should handle job completion", async function () {
    const bounty = ethers.parseEther("1.0");
    const bond = ethers.parseEther("0.1");

    await marketplace.connect(customer).postJob("Get coffee", bond, { value: bounty });
    await marketplace.connect(worker).acceptJob(0, { value: bond });

    // Check balances before
    const workerBalanceBefore = await ethers.provider.getBalance(worker.address);

    const tx = await marketplace.connect(customer).completeJob(0, 5); // 5 star rating
    await tx.wait();

    // Verify worker got bounty + bond
    // Note: 5% platform fee is deducted from bounty for Tier 0 worker
    const fee = (bounty * 500n) / 10000n;
    const workerBalanceAfter = await ethers.provider.getBalance(worker.address);
    expect(workerBalanceAfter).to.equal(workerBalanceBefore + (bounty - fee) + bond);

    // Verify rewards
    expect(await rewardEngine.balanceOf(worker.address)).to.equal(ethers.parseEther("100"));

    // Verify reputation
    const score = await registry.reputationScores(worker.address);
    expect(score).to.equal(500);
  });

  it("Should allow worker to dispute a job", async function () {
    const bounty = ethers.parseEther("1.0");
    const bond = ethers.parseEther("0.1");

    await marketplace.connect(customer).postJob("Dispute me", bond, { value: bounty });
    await marketplace.connect(worker).acceptJob(0, { value: bond });

    await expect(marketplace.connect(worker).disputeJob(0, "QmHash"))
      .to.emit(marketplace, "JobDisputed")
      .withArgs(0, worker.address, "QmHash");

    const job = await marketplace.jobs(0);
    expect(job.status).to.equal(3); // Disputed
  });

  it("Should allow arbitrator to resolve dispute (Customer Wins)", async function () {
    const bounty = ethers.parseEther("1.0");
    const bond = ethers.parseEther("0.1");

    await marketplace.connect(customer).postJob("Slash me", bond, { value: bounty });
    await marketplace.connect(worker).acceptJob(0, { value: bond });
    await marketplace.connect(worker).disputeJob(0, "QmHash");

    // Check balances before slash
    const customerBalanceBefore = await ethers.provider.getBalance(customer.address);

    // Arbitrator (owner) calls resolveDispute
    const tx = await marketplace.connect(owner).resolveDispute(0, false, 0);
    await tx.wait();

    // Verify events
    await expect(tx).to.emit(marketplace, "JobSlashed").withArgs(0, worker.address, bond);
    await expect(tx).to.emit(marketplace, "JobResolved").withArgs(0, owner.address, false);

    // Verify customer got bounty + bond
    const customerBalanceAfter = await ethers.provider.getBalance(customer.address);
    // Customer paid bounty in postJob. Bond paid by worker.
    // Refund = bounty + bond.
    expect(customerBalanceAfter).to.equal(customerBalanceBefore + bounty + bond);

    const job = await marketplace.jobs(0);
    expect(job.status).to.equal(4); // Rejected
  });

  it("Should allow arbitrator to resolve dispute (Worker Wins)", async function () {
    const bounty = ethers.parseEther("1.0");
    const bond = ethers.parseEther("0.1");

    await marketplace.connect(customer).postJob("Resolve me", bond, { value: bounty });
    await marketplace.connect(worker).acceptJob(0, { value: bond });
    await marketplace.connect(worker).disputeJob(0, "QmHash");

    const workerBalanceBefore = await ethers.provider.getBalance(worker.address);

    // Arbitrator calls resolveDispute with workerWins = true, rating = 5
    const tx = await marketplace.connect(owner).resolveDispute(0, true, 5);
    await tx.wait();

    await expect(tx).to.emit(marketplace, "JobCompleted").withArgs(0, worker.address, 5);
    await expect(tx).to.emit(marketplace, "JobResolved").withArgs(0, owner.address, true);

    const fee = (bounty * 500n) / 10000n;
    const workerBalanceAfter = await ethers.provider.getBalance(worker.address);
    // Worker gets bounty - fee + bond
    expect(workerBalanceAfter).to.equal(workerBalanceBefore + (bounty - fee) + bond);

    const job = await marketplace.jobs(0);
    expect(job.status).to.equal(2); // Completed
  });

  it("Should enforce minimum reputation score for job types", async function () {
    // Set min score for "ExpertJob" to 400
    await registry.connect(owner).setMinReputationScore("ExpertJob", 400);

    const bounty = ethers.parseEther("1.0");
    const bond = ethers.parseEther("0.1");

    // Post "ExpertJob"
    await marketplace.connect(customer).postJob("ExpertJob", bond, { value: bounty });

    // Worker has 0 score, should fail
    await expect(marketplace.connect(worker).acceptJob(0, { value: bond }))
      .to.be.revertedWith("Not eligible");

    // Post "EasyJob" to build reputation
    await marketplace.connect(customer).postJob("EasyJob", bond, { value: bounty });
    await marketplace.connect(worker).acceptJob(1, { value: bond });
    await marketplace.connect(customer).completeJob(1, 5);

    // Now worker has 500 score (1 job, 5 stars). Should be able to accept ExpertJob (job 0)
    await marketplace.connect(worker).acceptJob(0, { value: bond });

    const job = await marketplace.jobs(0);
    expect(job.worker).to.equal(worker.address);
  });

  it("Should return active job types correctly", async function () {
    const bond = ethers.parseEther("0.1");
    const bounty = ethers.parseEther("1.0");

    await marketplace.connect(customer).postJob("Cleaning", bond, { value: bounty });
    await marketplace.connect(customer).postJob("Programming", bond, { value: bounty });
    await marketplace.connect(customer).postJob("Cleaning", bond, { value: bounty }); // Duplicate type

    const types = await marketplace.getActiveJobTypes();
    expect(types.length).to.equal(2);
    expect(types[0]).to.equal("Cleaning");
    expect(types[1]).to.equal("Programming");
  });

  describe("Administrative Functions", function () {
    it("Should allow admin to update treasury", async function () {
      await expect(marketplace.connect(owner).setTreasury(other.address))
        .to.emit(marketplace, "TreasuryUpdated")
        .withArgs(owner.address, other.address);

      expect(await marketplace.treasury()).to.equal(other.address);
    });

    it("Should allow admin to update platform fee", async function () {
      const newFee = 1000; // 10%
      await expect(marketplace.connect(owner).setPlatformFee(newFee))
        .to.emit(marketplace, "PlatformFeeUpdated")
        .withArgs(500, newFee);

      expect(await marketplace.platformFeeBps()).to.equal(newFee);
    });

    it("Should fail if non-admin tries to update treasury or fee", async function () {
      await expect(marketplace.connect(customer).setTreasury(other.address))
        .to.be.reverted; // AccessControl error

      await expect(marketplace.connect(customer).setPlatformFee(1000))
        .to.be.reverted;
    });

    it("Should fail with invalid inputs", async function () {
      await expect(marketplace.connect(owner).setTreasury(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid address");

      await expect(marketplace.connect(owner).setPlatformFee(10001))
        .to.be.revertedWith("Fee too high");
    });
  });
});
