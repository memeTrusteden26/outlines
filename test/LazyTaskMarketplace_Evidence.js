const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LazyTaskMarketplace Evidence", function () {
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

  it("Should allow worker to submit evidence for accepted job", async function () {
    const bounty = ethers.parseEther("1.0");
    const bond = ethers.parseEther("0.1");

    await marketplace.connect(customer).postJob("Evidence Test", bond, { value: bounty });
    await marketplace.connect(worker).acceptJob(0, { value: bond });

    await expect(marketplace.connect(worker).submitEvidence(0, "QmHash"))
      .to.emit(marketplace, "EvidenceSubmitted")
      .withArgs(0, worker.address, "QmHash");
  });

  it("Should fail if non-worker submits evidence", async function () {
    const bounty = ethers.parseEther("1.0");
    const bond = ethers.parseEther("0.1");

    await marketplace.connect(customer).postJob("Evidence Test", bond, { value: bounty });
    await marketplace.connect(worker).acceptJob(0, { value: bond });

    await expect(marketplace.connect(other).submitEvidence(0, "QmHash"))
      .to.be.revertedWith("Only worker");
  });

  it("Should fail if job is not accepted", async function () {
    const bounty = ethers.parseEther("1.0");
    const bond = ethers.parseEther("0.1");

    await marketplace.connect(customer).postJob("Evidence Test", bond, { value: bounty });

    // Try before accept
    await expect(marketplace.connect(worker).submitEvidence(0, "QmHash"))
      .to.be.revertedWith("Only worker"); // Reverts with "Only worker" because worker is address(0) initially

    // Another user tries
    await expect(marketplace.connect(other).submitEvidence(0, "QmHash"))
      .to.be.revertedWith("Only worker");
  });

  it("Should fail if job is already completed", async function () {
    const bounty = ethers.parseEther("1.0");
    const bond = ethers.parseEther("0.1");

    await marketplace.connect(customer).postJob("Evidence Test", bond, { value: bounty });
    await marketplace.connect(worker).acceptJob(0, { value: bond });
    await marketplace.connect(customer).completeJob(0, 5);

    await expect(marketplace.connect(worker).submitEvidence(0, "QmHash"))
      .to.be.revertedWith("Job not accepted");
  });
});
