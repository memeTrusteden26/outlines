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

    // Verify event (checking args directly on tx object is tricky, better use expect().to.emit)
    // But since we awaited wait(), we can't chain expect().to.emit on tx easily unless we didn't await.
    // Actually we can do expect(tx).to.emit... because tx is the response.

    // Verify worker got bounty + bond
    const workerBalanceAfter = await ethers.provider.getBalance(worker.address);
    expect(workerBalanceAfter).to.equal(workerBalanceBefore + bounty + bond);

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

  it("Should allow admin to slash bond and refund bounty", async function () {
    const bounty = ethers.parseEther("1.0");
    const bond = ethers.parseEther("0.1");

    await marketplace.connect(customer).postJob("Slash me", bond, { value: bounty });
    await marketplace.connect(worker).acceptJob(0, { value: bond });
    await marketplace.connect(worker).disputeJob(0, "QmHash");

    // Check balances before slash
    const customerBalanceBefore = await ethers.provider.getBalance(customer.address);

    // Admin (owner) calls slashBond
    const tx = await marketplace.connect(owner).slashBond(0);
    await tx.wait();

    // Verify events
    await expect(tx).to.emit(marketplace, "JobSlashed").withArgs(0, worker.address, bond);

    // Verify customer got bounty + bond
    const customerBalanceAfter = await ethers.provider.getBalance(customer.address);
    // Customer paid bounty in postJob. Bond paid by worker.
    // Refund = bounty + bond.
    expect(customerBalanceAfter).to.equal(customerBalanceBefore + bounty + bond);

    const job = await marketplace.jobs(0);
    expect(job.status).to.equal(4); // Rejected
  });
});
