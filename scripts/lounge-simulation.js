const hre = require("hardhat");

const LIZARD_LOUNGE_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
const REPUTATION_REGISTRY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

async function main() {
  console.log("🦎 Starting Lizard Lounge Simulation...");

  // Setup Agents
  const [admin, agent1, agent2, agent3] = await hre.ethers.getSigners();
  console.log(`Agents: \n1: ${agent1.address}\n2: ${agent2.address}\n3: ${agent3.address}`);

  const LizardLounge = await hre.ethers.getContractFactory("LizardLounge");
  const lounge = LizardLounge.attach(LIZARD_LOUNGE_ADDRESS);

  const ReputationRegistry = await hre.ethers.getContractFactory("ReputationRegistry");
  const reputation = ReputationRegistry.attach(REPUTATION_REGISTRY_ADDRESS);

  // 1. Agent 1 Creates a Table
  console.log("\n--- Creating Table ---");
  const tx1 = await lounge.connect(agent1).createTable("Python Devs", "Discussing snake case");
  const rc1 = await tx1.wait();
  // Parse event to find tableId? Hard to get from logs easily in script without parsing logic
  // But since nextTableId starts at 1, this should be Table 1.
  console.log("Agent 1 created Table 'Python Devs' (ID 1)");

  // 2. Agent 2 Requests to Join
  console.log("\n--- Joining Table ---");
  await lounge.connect(agent2).requestJoin(1);
  console.log("Agent 2 requested to join Table 1");

  // 3. Agent 1 Approves Agent 2
  console.log("\n--- Approving Member ---");
  await lounge.connect(agent1).approveJoin(1, agent2.address);
  console.log("Agent 1 approved Agent 2");

  // 4. Chatting
  console.log("\n--- Chatting ---");
  await lounge.connect(agent1).postMessage(1, "Welcome to the den!");
  console.log("Agent 1: Welcome to the den!");

  await lounge.connect(agent2).postMessage(1, "Sssthanks! Happy to be here.");
  console.log("Agent 2: Sssthanks! Happy to be here.");

  // 5. Chatting in Main Lounge (Table 0)
  console.log("\n--- Main Lounge Chat ---");
  await lounge.connect(agent3).postMessage(0, "Anyone seen a fly?");
  console.log("Agent 3 (Main): Anyone seen a fly?");

  // 6. Skill Generation (Agent 1 has 0 rep, so this should fail)
  console.log("\n--- Skill Generation (Fail Case) ---");
  try {
    await lounge.connect(agent1).announceSkill("Python");
    console.log("❌ Agent 1 announced skill (Unexpected Success)");
  } catch (e) {
    console.log("✅ Agent 1 failed to announce skill (Low Reputation) - Expected");
  }

  // 7. Boost Reputation & Try Again
  console.log("\n--- Boosting Reputation ---");
  // Admin grants MARKETPLACE_ROLE to itself to record a fake job
  const MARKETPLACE_ROLE = await reputation.MARKETPLACE_ROLE();
  await reputation.connect(admin).grantRole(MARKETPLACE_ROLE, admin.address);

  // Record a job for Agent 1 with 5 stars (should give 100 score if logic holds: score = total * 100 / count => 5 * 100 / 1 = 500)
  await reputation.connect(admin).recordJob(agent1.address, 999, 5, ethers.parseEther("1.0"));
  const newScore = await reputation.reputationScores(agent1.address);
  console.log(`Agent 1 New Score: ${newScore} (Target > 100)`);

  // 8. Skill Generation (Success Case)
  console.log("\n--- Skill Generation (Success Case) ---");
  try {
    await lounge.connect(agent1).announceSkill("Python");
    console.log("✅ Agent 1 announced skill 'Python'!");

    // Verify in Registry
    const minScore = await reputation.minReputationScores("Python");
    console.log(`Registry now has 'Python' with min score: ${minScore}`);
  } catch (e) {
    console.error("❌ Agent 1 failed to announce skill:", e.message);
  }

  // 9. Kick Member
  console.log("\n--- Kicking Member ---");
  await lounge.connect(agent1).kickMember(1, agent2.address);
  console.log("Agent 1 kicked Agent 2 from Table 1");

  try {
    await lounge.connect(agent2).postMessage(1, "Can I still speak?");
    console.log("❌ Agent 2 posted message (Unexpected Success)");
  } catch (e) {
    console.log("✅ Agent 2 blocked from posting - Expected");
  }

  console.log("\n🦎 Simulation Complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
