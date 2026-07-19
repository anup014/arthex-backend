require("dotenv").config();
const axios = require("axios");

async function listModels() {
  try {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`
    );

    console.log("Available Models:\n");

    response.data.models.forEach(model => {
      console.log("Model:", model.name);
      console.log("Supported methods:", model.supportedGenerationMethods);
      console.log("----------------------------");
    });

  } catch (err) {
    console.error("Error listing models:");
    console.error(err.response?.data || err.message);
  }
}

listModels();