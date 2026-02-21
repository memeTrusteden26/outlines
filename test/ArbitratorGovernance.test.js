const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("ArbitratorGovernance", function () {
  let rewardEngine, marketplace, governance, registry;
  let admin, worker, newArbitrator;

  beforeEach(async function () {
    [admin, worker, newArbitrator] = await ethers.getSigners();

    // Deploy ReputationRegistry (needed for Marketplace)
    const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
    registry = await ReputationRegistry.deploy();

    // Deploy RewardEngine (Token)
    const RewardEngine = await ethers.getContractFactory("RewardEngine");
    rewardEngine = await RewardEngine.deploy();

    // Deploy Marketplace
    const LazyTaskMarketplace = await ethers.getContractFactory("LazyTaskMarketplace");
    marketplace = await LazyTaskMarketplace.deploy(registry.target, rewardEngine.target);

    // Deploy Governance
    const ArbitratorGovernance = await ethers.getContractFactory("ArbitratorGovernance");
    governance = await ArbitratorGovernance.deploy(rewardEngine.target, marketplace.target);

    // Setup Roles
    // Governance needs admin role on Marketplace to grant roles
    const ARBITRATOR_ADMIN_ROLE = await marketplace.ARBITRATOR_ADMIN_ROLE();
    await marketplace.grantRole(ARBITRATOR_ADMIN_ROLE, governance.target);

    // Mint tokens to admin for voting
    // Grant MARKETPLACE_ROLE to admin to mint via issueRewards
    const MARKETPLACE_ROLE = await rewardEngine.MARKETPLACE_ROLE();
    await rewardEngine.grantRole(MARKETPLACE_ROLE, admin.address);

    // Issue rewards to get tokens (100 tokens per call)
    // We need 100 tokens to propose (minProposalThreshold)
    await rewardEngine.issueRewards(admin.address, 5);

    // Delegate to self to have voting power
    await rewardEngine.delegate(admin.address);
  });

  it("Should allow proposing and voting for a new arbitrator", async function () {
    const ARBITRATOR_ROLE = await marketplace.ARBITRATOR_ROLE();
    expect(await marketplace.hasRole(ARBITRATOR_ROLE, newArbitrator.address)).to.be.false;

    // Mine a block to ensure checkpoint is created for delegation
    await ethers.provider.send("evm_mine");

    await governance.propose(newArbitrator.address);
    const proposalId = 1;

    // Wait for voting start?
    // In our simplified Governance, voting starts immediately (snapshotBlock is previous).
    // So we can vote now.

    await governance.vote(proposalId, true);

    const votingDuration = await governance.votingDuration();
    await time.increase(votingDuration);

    await governance.execute(proposalId);

    expect(await marketplace.hasRole(ARBITRATOR_ROLE, newArbitrator.address)).to.be.true;
  });

  it("Should fail if proposal does not pass", async function () {
    await ethers.provider.send("evm_mine");
    await governance.propose(newArbitrator.address);
    const proposalId = 1;

    await governance.vote(proposalId, false);

    const votingDuration = await governance.votingDuration();
    await time.increase(votingDuration);

    await expect(governance.execute(proposalId)).to.be.revertedWith("Proposal failed");
  });
});
