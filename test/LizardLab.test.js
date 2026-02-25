const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lizard Lab & Lounge Integration", function () {
  let LizardToken, lizardToken;
  let LizardLounge, lizardLounge;
  let ReputationRegistry, reputationRegistry;
  let LazyTaskMarketplace, lazyTaskMarketplace; // Added for mock
  let RewardEngine, rewardEngine; // Added for mock
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy ReputationRegistry (dependency for Lounge)
    ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
    reputationRegistry = await ReputationRegistry.deploy();
    await reputationRegistry.waitForDeployment();

    // Deploy LizardToken
    LizardToken = await ethers.getContractFactory("LizardToken");
    lizardToken = await LizardToken.deploy();
    await lizardToken.waitForDeployment();

    // Mock/Deploy other dependencies if needed by constructor
    // The merged constructor expects: (ReputationRegistry, Marketplace, LizardToken)
    // We can use a dummy address for Marketplace or deploy it properly.
    // Let's deploy properly to avoid issues.

    RewardEngine = await ethers.getContractFactory("RewardEngine");
    rewardEngine = await RewardEngine.deploy();
    await rewardEngine.waitForDeployment();

    LazyTaskMarketplace = await ethers.getContractFactory("LazyTaskMarketplace");
    lazyTaskMarketplace = await LazyTaskMarketplace.deploy(
        await reputationRegistry.getAddress(),
        await rewardEngine.getAddress()
    );
    await lazyTaskMarketplace.waitForDeployment();


    // Deploy LizardLounge
    LizardLounge = await ethers.getContractFactory("LizardLounge");
    lizardLounge = await LizardLounge.deploy(
        await reputationRegistry.getAddress(),
        await lazyTaskMarketplace.getAddress(), // Added Marketplace address
        await lizardToken.getAddress()
    );
    await lizardLounge.waitForDeployment();
  });

  describe("LizardToken", function () {
    it("Should mint a base lizard", async function () {
      await lizardToken.connect(user1).mint("Space");
      expect(await lizardToken.ownerOf(0)).to.equal(user1.address);
      expect(await lizardToken.lizardNames(0)).to.equal("Space");
    });

    it("Should breed two lizards", async function () {
      await lizardToken.connect(user1).mint("Space");
      await lizardToken.connect(user1).mint("Lizard");

      await lizardToken.connect(user1).breed(0, 1);

      expect(await lizardToken.ownerOf(2)).to.equal(user1.address);
      expect(await lizardToken.lizardNames(2)).to.equal("Space Lizard");
    });

    it("Should fail if breeding lizards owned by different users", async function () {
      await lizardToken.connect(user1).mint("Space");
      await lizardToken.connect(user2).mint("Lizard");

      await expect(
        lizardToken.connect(user1).breed(0, 1)
      ).to.be.revertedWith("Not owner of parent 2");
    });
  });

  describe("LizardLounge Integration", function () {
    beforeEach(async function () {
      await lizardToken.connect(user1).mint("Space Lizard"); // Token 0
    });

    it("Should allow equipping a lizard", async function () {
      await lizardLounge.connect(user1).equipLizard(0);
      expect(await lizardLounge.equippedLizard(user1.address)).to.equal(0);
      expect(await lizardLounge.hasEquipped(user1.address)).to.be.true;
    });

    it("Should fail if equipping a lizard not owned", async function () {
      await expect(
        lizardLounge.connect(user2).equipLizard(0)
      ).to.be.revertedWith("You do not own this lizard");
    });

    it("Should include lizard name in message event", async function () {
      await lizardLounge.connect(user1).equipLizard(0);

      const tx = await lizardLounge.connect(user1).postMessage(0, "Hello World");
      const receipt = await tx.wait();

      // Find Message event
      const event = receipt.logs.find(log => {
        try {
            const parsed = lizardLounge.interface.parseLog(log);
            return parsed.name === "Message";
        } catch (e) { return false; }
      });

      const parsedEvent = lizardLounge.interface.parseLog(event);
      expect(parsedEvent.args.lizardName).to.equal("Space Lizard");
    });

    it("Should verify ownership during postMessage", async function () {
      await lizardLounge.connect(user1).equipLizard(0);

      // Transfer lizard away
      await lizardToken.connect(user1).transferFrom(user1.address, user2.address, 0);

      // Post message
      const tx = await lizardLounge.connect(user1).postMessage(0, "I lost my lizard");
      const receipt = await tx.wait();

      const event = receipt.logs.find(log => {
          try { return lizardLounge.interface.parseLog(log).name === "Message"; } catch { return false; }
      });
      const parsedEvent = lizardLounge.interface.parseLog(event);

      // Should be empty string because they don't own it anymore
      expect(parsedEvent.args.lizardName).to.equal("");
    });
  });
});
