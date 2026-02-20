const { ethers } = require("ethers");

/**
 * Gets the agent's wallet from environment variables.
 * @param {string} [providerUrl] - Optional JSON-RPC provider URL. Defaults to localhost if not set.
 * @returns {ethers.Wallet} The connected wallet instance.
 */
function getAgentWallet(providerUrl) {
    const privateKey = process.env.PRIVATE_KEY;

    // Default to hardhat network if no provider URL is given
    if (!providerUrl) {
        providerUrl = "http://127.0.0.1:8545";
    }

    const provider = new ethers.JsonRpcProvider(providerUrl);

    if (privateKey) {
        return new ethers.Wallet(privateKey, provider);
    } else {
        console.warn("No PRIVATE_KEY found in env. Generating random wallet for testing.");
        return ethers.Wallet.createRandom().connect(provider);
    }
}

module.exports = { getAgentWallet };
