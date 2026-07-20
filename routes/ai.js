const express = require("express");
const router = express.Router();

router.post("/chat", async (req, res) => {

    const {message} = req.body;

    res.json({

        reply:
`AI Response

You asked:

${message}

This is where GPT will answer later.`

    });

});

module.exports = router;