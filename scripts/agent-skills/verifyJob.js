const { ethers } = require("hardhat");

/**
 * Analyze image using OpenAI Vision API
 * @param {string} imageUrl - URL of the image to analyze
 * @param {string} taskType - Type of task (e.g., "coffee delivery", "package pickup")
 * @returns {Promise<{isVerified: boolean, analysis: string, rating: number}>}
 */
async function analyzeWithAI(imageUrl, taskType) {
    // If no OpenAI key, fall back to mock logic
    if (!process.env.OPENAI_API_KEY) {
        console.log("⚠️ No OPENAI_API_KEY - using mock AI vision");
        return mockVisionAnalysis(imageUrl, taskType);
    }

    const OpenAI = require("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `You are an AI verification agent for a task marketplace. 
    Analyze this image for a "${taskType}" task.
    Determine if the task was completed successfully.
    Return a JSON with: { "isVerified": true/false, "reason": "detailed explanation", "rating": 1-5 }`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: imageUrl } }
                    ]
                }
            ],
            max_tokens: 300
        });

        const result = JSON.parse(response.choices[0].message.content);
        console.log("🤖 AI Vision Result:", result);
        return result;
    } catch (error) {
        console.error("AI Vision Error:", error.message);
        return mockVisionAnalysis(imageUrl, taskType);
    }
}

/**
 * Mock vision analysis for testing without OpenAI API
 */
function mockVisionAnalysis(imageUrl, taskType) {
    let isVerified = false;
    let rating = 0;
    let reason = "";

    if (imageUrl.includes("valid_")) {
        isVerified = true;
        reason = "Mock: Valid evidence provided";
        rating = taskType.includes("coffee") ? 5 : 4;
    } else {
        isVerified = false;
        reason = "Mock: Evidence unclear or invalid";
        rating = 1;
    }

    return { isVerified, reason, rating };
}

async function verifyJob(marketplace, jobId, evidenceUrl, signer, taskType = "general") {
    console.log(`\n🤖 Agent Verifying Job ${jobId} with evidence: ${evidenceUrl}`);
    console.log(`   Task type: ${taskType}`);

    // Get AI to analyze the evidence
    const { isVerified, reason, rating } = await analyzeWithAI(evidenceUrl, taskType);

    console.log(`\n📊 AI Analysis:`);
    console.log(`   Verified: ${isVerified}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Rating: ${rating}/5`);

    if (isVerified) {
        console.log("\n✅ Agent Approving Job - Calling completeJob...");
        try {
            const tx = await marketplace.connect(signer).completeJob(jobId, rating);
            await tx.wait();
            console.log(`🎉 Job ${jobId} completed! Rating: ${rating}. Bounty + Bond released.`);
        } catch (error) {
            console.error("❌ Error completing job:", error.message);
        }
    } else {
        console.log("\n❌ Agent Rejected Job - Evidence did not meet criteria");
        console.log("   In production: This could trigger a dispute or request additional evidence");
    }

    return { isVerified, reason, rating };
}

module.exports = { verifyJob, analyzeWithAI };
