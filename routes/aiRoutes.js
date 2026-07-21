const express = require("express");
const router = express.Router();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/chat", async (req, res) => {
  console.log("==================================");
console.log("NEW AI REQUEST RECEIVED");
console.log("Time:", new Date().toISOString());
console.log("Message:", req.body.message);
console.log("==================================");
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        reply: "Please enter a question."
      });
    }

    const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash"
});
    console.log("Question received:", message);
    console.log("Calling Gemini...");
    const result = await model.generateContent(`
You are ARTHEX AI.

You are a professional Indian Stock Market Assistant.

Always answer like a financial analyst.

User Question:
${message}
`);

   const response = await result.response;
   const text = response.text();

   console.log("Gemini replied:");
   console.log(text);

   res.json({
  reply: text
  });

  } catch (err) {
  console.error("========== GEMINI ERROR ==========");
  console.error(err);
  console.error(err.message);

  if (err.errorDetails) {
    console.error(err.errorDetails);
  }

  res.status(500).json({
    reply: err.message
  });
}
});

module.exports = router;