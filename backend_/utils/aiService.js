const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Generates a concise summary of chat messages.
 */
const generateSummary = async (messages) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing in environment variables.");
    }

    try {
        // Use trimmed key to avoid accidental whitespace issues
        const genAI = new GoogleGenerativeAI(apiKey.trim());

        // We use gemini-2.0-flash as it was confirmed available in the user's model list
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const messageContext = messages
            .map((m) => `${m.sender?.userName || "User"}: ${m.content}`)
            .join("\n");

        const prompt = `You are an AI assistant for a chat app called SyncTalk. 
Your task is to provide a concise, 3-bullet point summary of the following recent conversation. 
Focus on the main topics discussed and any action items. 
Keep it brief and friendly.

Conversation:
${messageContext}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini AI Summary Error:", error);
        // Rethrow with a prefix so the controller can pass it through
        throw new Error(`AI Error: ${error.message || "Failed to generate summary"}`);
    }
};

module.exports = { generateSummary };
