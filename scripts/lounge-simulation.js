const hre = require("hardhat");

const LIZARD_LOUNGE_ADDRESS = "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1";
const REPUTATION_REGISTRY_ADDRESS = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
const LAZY_TASK_MARKETPLACE_ADDRESS = "0x0B306BF915C4d645ff596e518fAf3F9669b97016";

async function main() {
  console.log("🦎 Starting Lizard Lounge Simulation...");

  // Setup Agents
  const [admin, agent1, agent2, agent3] = await hre.ethers.getSigners();
  console.log(`Agents: \n1: ${agent1.address}\n2: ${agent2.address}\n3: ${agent3.address}`);

  const LizardLounge = await hre.ethers.getContractFactory("LizardLounge");
  const lounge = LizardLounge.attach(LIZARD_LOUNGE_ADDRESS);

  const ReputationRegistry = await hre.ethers.getContractFactory("ReputationRegistry");
  const reputation = ReputationRegistry.attach(REPUTATION_REGISTRY_ADDRESS);

  const Marketplace = await hre.ethers.getContractFactory("LazyTaskMarketplace");
  const marketplace = Marketplace.attach(LAZY_TASK_MARKETPLACE_ADDRESS);

  // 1. Agent 1 Creates a Table
  console.log("\n--- Creating Table ---");
  const tx1 = await lounge.connect(agent1).createTable("Python Devs", "Discussing snake case");
  const rc1 = await tx1.wait();
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

  // 6. Skill Generation
  console.log("\n--- Skill Generation ---");
  // Boost Reputation first
  const MARKETPLACE_ROLE = await reputation.MARKETPLACE_ROLE();
  await reputation.connect(admin).grantRole(MARKETPLACE_ROLE, admin.address);
  // Record a dummy job to boost score. JobID 999.
  await reputation.connect(admin).recordJob(agent1.address, 999, 5, hre.ethers.parseEther("1.0"));

  try {
    await lounge.connect(agent1).announceSkill("Python");
    console.log("✅ Agent 1 announced skill 'Python'!");
  } catch (e) {
    console.error("❌ Agent 1 failed to announce skill:", e.message);
  }

  // 7. Job Chat Simulation
  console.log("\n--- Job Chat Simulation ---");

  // Agent 1 (Customer) posts a job
  // Need to ensure activeJobTypes has "Python" or whatever, or just use a generic one if validation exists.
  // Marketplace creates types dynamically on post if not exist?
  // Let's check `postJob`.
  // `if (!activeJobTypesMap[typeHash]) { ... push ... }` -> Yes, it auto-adds.
  const jobTx = await marketplace.connect(agent1).postJob("PythonScript", hre.ethers.parseEther("0.1"), { value: hre.ethers.parseEther("1.0") });
  const jobRc = await jobTx.wait();
  const nextId = await marketplace.nextJobId();
  const jobId = nextId - 1n; // The job we just posted
  console.log(`Job Posted by Agent 1 (ID ${jobId})`);

  // Agent 2 (Worker) accepts the job
  // Bond required is 0.1 ETH.
  // Check eligibility? "PythonScript" type might have min score?
  // We set min score for "Python" in previous step via announceSkill?
  // announceSkill("Python") -> setMinReputationScore("Python", 0).
  // Here we used "PythonScript". No min score set, so 0 default. Safe.
  await marketplace.connect(agent2).acceptJob(jobId, { value: hre.ethers.parseEther("0.1") });
  console.log(`Job Accepted by Agent 2`);

  // Chatting
  console.log("Start Chatting...");
  await lounge.connect(agent1).postJobMessage(jobId, "Can you finish this by tomorrow?");
  console.log("Agent 1 (Customer): Can you finish this by tomorrow?");

  await lounge.connect(agent2).postJobMessage(jobId, "Yes boss, sssure thing.");
  console.log("Agent 2 (Worker): Yes boss, sssure thing.");

  // Unauthorized Chat Attempt
  try {
    await lounge.connect(agent3).postJobMessage(jobId, "I want to spy!");
    console.log("❌ Agent 3 spy attempt (Unexpected Success)");
  } catch (e) {
    console.log("✅ Agent 3 spy attempt blocked - Expected");
  }

  console.log("\n🦎 Simulation Complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
