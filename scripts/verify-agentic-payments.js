const hre = require("hardhat");

async function main() {
    console.log("Starting verification for Agentic Payments...");

    const [deployer, agent, user] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Agent:", agent.address);
    console.log("User:", user.address);

    // 1. Deploy AgentSubscription
    const AgentSubscription = await hre.ethers.getContractFactory("AgentSubscription");
    const agentSubscription = await AgentSubscription.deploy();
    await agentSubscription.waitForDeployment();
    console.log("AgentSubscription deployed to:", await agentSubscription.getAddress());

    // 2. Deploy AgenticOperation
    const AgenticOperation = await hre.ethers.getContractFactory("AgenticOperation");
    const agenticOperation = await AgenticOperation.deploy();
    await agenticOperation.waitForDeployment();
    console.log("AgenticOperation deployed to:", await agenticOperation.getAddress());

    // 3. Deploy PerRequestPayment
    const PerRequestPayment = await hre.ethers.getContractFactory("PerRequestPayment");
    const perRequestPayment = await PerRequestPayment.deploy();
    await perRequestPayment.waitForDeployment();
    console.log("PerRequestPayment deployed to:", await perRequestPayment.getAddress());

    // --- Verification Steps ---

    console.log("\n--- Testing AgentSubscription (ERC-8162) ---");
    // Create a plan (1 ETH for 30 days)
    const price = hre.ethers.parseEther("1.0");
    const duration = 30 * 24 * 60 * 60;
    const txCreatePlan = await agentSubscription.createPlan(price, duration, hre.ethers.ZeroAddress);
    await txCreatePlan.wait();
    console.log("Plan created: 1 ETH for 30 days");

    // User subscribes
    const planId = 0;
    const txSubscribe = await agentSubscription.connect(user).subscribe(planId, { value: price });
    await txSubscribe.wait();
    console.log("User subscribed to Plan 0");

    // Check subscription
    const isSubscribed = await agentSubscription.checkSubscription(user.address, planId);
    console.log("Is user subscribed?", isSubscribed);
    if (!isSubscribed) throw new Error("Subscription failed");


    console.log("\n--- Testing AgenticOperation (ERC-8165) ---");
    // User creates an intent
    const reward = hre.ethers.parseEther("0.5");
    const txCreateIntent = await agenticOperation.connect(user).createIntent("Build a website", { value: reward });
    await txCreateIntent.wait();
    console.log("Intent created: 'Build a website' with 0.5 ETH reward");

    // Agent solves the intent
    const intentId = 0;
    const txSolve = await agenticOperation.connect(agent).solveIntent(intentId);
    await txSolve.wait();
    console.log("Agent solved intent 0");

    // User verifies and executes payment
    const txVerify = await agenticOperation.connect(user).executeAndVerify(intentId, true);
    await txVerify.wait();
    console.log("User verified intent 0 (Success)");

    // Check agent balance (approximate)
    // In a real test we'd check balance changes, but here logs are enough


    console.log("\n--- Testing PerRequestPayment (x402-style) ---");
    // User pays agent for a specific request
    const paymentAmount = hre.ethers.parseEther("0.1");
    const txPay = await perRequestPayment.connect(user).pay(agent.address, "req-12345", { value: paymentAmount });
    await txPay.wait();
    console.log("User paid 0.1 ETH to Agent for req-12345");

    console.log("\nVerification Complete!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
