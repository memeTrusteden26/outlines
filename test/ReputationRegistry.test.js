const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReputationRegistry", function () {
  let reputationRegistry;
  let owner;
  let worker;
  let marketplaceRole;

  beforeEach(async function () {
    [owner, worker] = await ethers.getSigners();
    const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
    reputationRegistry = await ReputationRegistry.deploy();
    marketplaceRole = await reputationRegistry.MARKETPLACE_ROLE();
    await reputationRegistry.grantRole(marketplaceRole, owner.address);
  });

  it("Should return worker history correctly", async function () {
    const jobId = 1;
    const rating = 5;
    const bounty = ethers.parseEther("1.0");

    await reputationRegistry.recordJob(worker.address, jobId, rating, bounty);

    const history = await reputationRegistry.getWorkerHistory(worker.address);
    expect(history.length).to.equal(1);
    expect(history[0].jobId).to.equal(jobId);
    expect(history[0].rating).to.equal(rating);
    expect(history[0].bounty).to.equal(bounty);
  });

  it("Should restrict eligibility based on min reputation score", async function () {
    const jobType = "Advanced Task";

    // Set min score for "Advanced Task" to 400
    await reputationRegistry.setMinReputationScore(jobType, 400);

    // Initial score is 0, should not be eligible
    expect(await reputationRegistry.checkEligibility(worker.address, jobType)).to.equal(false);

    // Record some good jobs to increase score
    // recordJob updates score. 5 star rating -> 500 score (since avg * 100)
    await reputationRegistry.recordJob(worker.address, 1, 5, ethers.parseEther("1.0"));

    // Check score
    const score = await reputationRegistry.reputationScores(worker.address);
    expect(score).to.equal(500);

    // Now should be eligible
    expect(await reputationRegistry.checkEligibility(worker.address, jobType)).to.equal(true);
  });

  it("Should allow everyone if no min score set", async function () {
    const jobType = "Easy Task";
    // No min score set
    expect(await reputationRegistry.checkEligibility(worker.address, jobType)).to.equal(true);
  });
});
