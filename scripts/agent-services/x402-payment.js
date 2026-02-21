/**
 * x402 Payment Service for LazyTask Marketplace
 * 
 * This enables AI agents to receive micropayments for task verification.
 * Part of Kite AI's "Agent-Native Payments & Identity" bounty ($10,000)
 */

const { ethers } = require("ethers");

/**
 * Create a payment request header for x402 protocol
 * @param {string} amount - Amount in ETH/TOKEN
 * @param {string} description - Payment description
 * @returns {Object} x402 payment header
 */
function createPaymentRequest(amount, description) {
    return {
        "x402-version": 1,
        "x402-payment-type": "ether",
        "x402-amount": amount,
        "x402-description": description,
        "x402-network": "base-sepolia" // or sepolia, base
    };
}

/**
 * Verify incoming payment from a client
 * @param {Object} headers - Request headers
 * @returns {boolean} Whether payment was verified
 */
function verifyPayment(headers) {
    const x402Header = headers["x402-payment"];
    if (!x402Header) {
        return false;
    }
    
    // In production, verify the payment signature and amount
    // For now, simplified check
    return x402Header.includes("verified=true");
}

/**
 * Agent payment service - allows agents to receive payments for verification work
 */
class AgentPaymentService {
    constructor(wallet, network = "base-sepolia") {
        this.wallet = wallet;
        this.network = network;
        this.balance = null;
    }

    /**
     * Get the agent's payment address
     */
    getAddress() {
        return this.wallet.address;
    }

    /**
     * Check agent's balance
     */
    async getBalance() {
        const balance = await this.wallet.provider.getBalance(this.wallet.address);
        this.balance = ethers.formatEther(balance);
        return this.balance;
    }

    /**
     * Create a payment request for job verification
     * @param {string} jobId - The job being verified
     * @param {number} amount - Payment amount in ETH
     */
    createVerificationPayment(jobId, amount = "0.001") {
        return {
            to: this.wallet.address,
            amount: amount,
            description: `Job verification payment for job ${jobId}`,
            headers: createPaymentRequest(amount, `Verification: ${jobId}`)
        };
    }

    /**
     * Withdraw accumulated balance
     */
    async withdraw(toAddress) {
        const balance = await this.wallet.provider.getBalance(this.wallet.address);
        if (balance === 0n) {
            console.log("No balance to withdraw");
            return;
        }

        const tx = {
            to: toAddress,
            value: balance
        };
        
        const response = await this.wallet.sendTransaction(tx);
        await response.wait();
        console.log(`Withdrawn ${ethers.formatEther(balance)} ETH to ${toAddress}`);
        return response;
    }
}

/**
 * Simple Express middleware for x402 payments
 */
function x402Middleware(req, res, next) {
    const paymentHeader = req.headers["x402-payment"];
    
    if (!paymentHeader) {
        // No payment required for this endpoint
        return next();
    }

    // Verify payment
    if (verifyPayment(req.headers)) {
        console.log("✅ Payment verified for request");
        next();
    } else {
        res.status(402).json({
            error: "Payment Required",
            message: "x402 payment not verified"
        });
    }
}

module.exports = {
    createPaymentRequest,
    verifyPayment,
    AgentPaymentService,
    x402Middleware
};
