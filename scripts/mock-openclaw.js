const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { ethers } = require("hardhat");
const { postJob } = require('./agent-skills/postJob');
const { verifyJob } = require('./agent-skills/verifyJob');

// Load deployments
const DEPLOYMENTS_PATH = path.join(__dirname, '../deployments.json');
let deployments = {};

try {
    if (fs.existsSync(DEPLOYMENTS_PATH)) {
        deployments = JSON.parse(fs.readFileSync(DEPLOYMENTS_PATH, 'utf8'));
    } else {
        console.warn("⚠️ deployments.json not found. Please run 'npx hardhat run scripts/deploy.js' first.");
    }
} catch (error) {
    console.error("Error reading deployments:", error);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'OpenClaw> '
});

async function main() {
    console.log("Welcome to OpenClaw Mock Agent (CLI Mode)");
    console.log("-----------------------------------------");
    console.log("Simulates an AI agent interacting with LazyTask Marketplace.");
    console.log("Type 'help' for commands.");

    // Setup Signer
    const [deployer] = await ethers.getSigners();
    // In a real scenario, this would be the agent's wallet
    const agent = deployer;
    console.log(`\nActing as Agent: ${agent.address}`);

    // Connect to Contract
    let marketplace;
    if (deployments.LazyTaskMarketplace) {
        const Marketplace = await ethers.getContractFactory("LazyTaskMarketplace");
        marketplace = Marketplace.attach(deployments.LazyTaskMarketplace);
        console.log(`Connected to Marketplace at: ${deployments.LazyTaskMarketplace}`);
    } else {
        console.error("❌ LazyTaskMarketplace address not found in deployments.");
        // We continue so the user can use 'help' or exit, but commands will fail
    }

    rl.prompt();

    rl.on('line', async (line) => {
        const args = line.trim().split(' ');
        const command = args[0];

        try {
            switch (command) {
                case 'help':
                    console.log(`
Commands:
  post <jobType> <bounty> [bond]   Post a new job (e.g., post "Coffee" 0.01)
  verify <jobId> <evidenceUrl>     Verify a job completion (e.g., verify 1 http://img.com/coffee.jpg)
  info                             Show agent info
  exit                             Exit the agent
                    `);
                    break;

                case 'post':
                    if (!marketplace) {
                        console.error("Marketplace not connected.");
                        break;
                    }
                    if (args.length < 3) {
                        console.log("Usage: post <jobType> <bounty> [bond]");
                        break;
                    }
                    const jobType = args[1].replace(/"/g, ''); // Simple quote removal
                    const bounty = args[2];
                    const bond = args[3] || "0.1"; // Default bond
                    await postJob(marketplace, jobType, bond, bounty, agent);
                    break;

                case 'verify':
                    if (!marketplace) {
                        console.error("Marketplace not connected.");
                        break;
                    }
                    if (args.length < 3) {
                        console.log("Usage: verify <jobId> <evidenceUrl>");
                        break;
                    }
                    const jobId = args[1];
                    const evidenceUrl = args[2];
                    await verifyJob(marketplace, jobId, evidenceUrl, agent);
                    break;

                case 'info':
                    console.log(`Agent Address: ${agent.address}`);
                    if (deployments.network) console.log(`Network: ${deployments.network}`);
                    break;

                case 'exit':
                    console.log('Exiting OpenClaw...');
                    process.exit(0);
                    break;

                case '':
                    break;

                default:
                    console.log(`Unknown command: '${command}'. Type 'help' for available commands.`);
                    break;
            }
        } catch (error) {
            console.error("Error executing command:", error.message);
        }

        rl.prompt();
    }).on('close', () => {
        console.log('Exiting OpenClaw...');
        process.exit(0);
    });
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
