const express = require("express");
const router = express.Router();
const Activity = require("../models/Activity");

// GET /activity — global feed (last 50)
router.get("/", async (req, res) => {
  try {
    const activities = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("userId", "username avatar")
      .populate("projectId", "title");
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /activity/user/:id — activity for a specific user
router.get("/user/:id", async (req, res) => {
  try {
    const activities = await Activity.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("userId", "username avatar")
      .populate("projectId", "title");
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
