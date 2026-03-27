const express = require("express");
const router = express.Router();
const multer = require("multer");
const User = require("../models/User");
const Project = require("../models/Project");
const auth = require("../middleware/auth");

const Activity = require("../models/Activity");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `avatar-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /users/:id
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    const projectCount = await Project.countDocuments({ userId: req.params.id });
    res.json({ ...user.toObject(), projectCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /users/:id/projects
router.get("/:id/projects", async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .populate("userId", "username avatar");
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /users/:id — edit profile (auth required, own profile only)
router.put("/:id", auth, upload.single("avatar"), async (req, res) => {
  try {
    if (req.params.id !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    const { bio, skills, accentColor } = req.body;
    const updates = {
      bio: bio || "",
      skills: skills ? JSON.parse(skills) : [],
      accentColor: accentColor || ""
    };
    if (req.file) updates.avatar = req.file.filename;

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /users/:id/follow
router.post("/:id/follow", auth, async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ message: "Cannot follow yourself" });

    const target = await User.findById(req.params.id);
    const me = await User.findById(req.user.id);
    if (!target || !me) return res.status(404).json({ message: "User not found" });

    const isFollowing = me.following.map(id => id.toString()).includes(req.params.id);
    if (isFollowing) {
      me.following = me.following.filter(id => id.toString() !== req.params.id);
      target.followers = target.followers.filter(id => id.toString() !== req.user.id);
    } else {
      me.following.push(req.params.id);
      target.followers.push(req.user.id);
    }

    await me.save();
    await target.save();
    if (!isFollowing) {
      await Activity.create({ userId: req.user.id, type: "followed", targetId: req.params.id });
    }
    res.json({ following: !isFollowing, followerCount: target.followers.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
