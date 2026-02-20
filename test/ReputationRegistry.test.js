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
});
