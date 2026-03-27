const express = require("express");
const router = express.Router();
const multer = require("multer");
const Project = require("../models/Project");
const Activity = require("../models/Activity");
const auth = require("../middleware/auth");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET /projects — supports ?search= ?tag= ?status= ?domain=
router.get("/", async (req, res) => {
  try {
    const { search, tag, status, domain } = req.query;
    const query = {};
    if (search) query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } }
    ];
    if (tag)    query.tags = { $in: [tag] };
    if (status) query.status = status;
    if (domain) query.domain = domain;

    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .populate("userId", "username avatar")
      .populate("remixedFrom", "title userId");
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /projects/:id
router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("userId", "username avatar")
      .populate("comments.userId", "username avatar")
      .populate("remixedFrom", "title userId");
    if (!project) return res.status(404).json({ message: "Not found" });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /projects — create with about, status, domain
router.post("/", auth, upload.array("files", 10), async (req, res) => {
  try {
    const { title, description, codeSnippet, tags, status, domain, features, howItWorks, futurePlans } = req.body;
    const files = (req.files || []).map(f => ({ name: f.originalname, path: f.filename, size: f.size }));

    const project = await Project.create({
      title, description, codeSnippet,
      tags: tags ? JSON.parse(tags) : [],
      status: status || "idea",
      domain: domain || "",
      about: { features: features || "", howItWorks: howItWorks || "", futurePlans: futurePlans || "" },
      files,
      userId: req.user.id
    });

    await Activity.create({ userId: req.user.id, type: "created", projectId: project._id });
    const populated = await project.populate("userId", "username avatar");
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /projects/:id/remix
router.post("/:id/remix", auth, async (req, res) => {
  try {
    const original = await Project.findById(req.params.id).populate("userId", "username");
    if (!original) return res.status(404).json({ message: "Project not found" });
    if (original.userId._id.toString() === req.user.id)
      return res.status(400).json({ message: "Cannot remix your own project" });

    const remixed = await Project.create({
      title: `${original.title} (Remix)`,
      description: original.description,
      codeSnippet: original.codeSnippet,
      tags: original.tags,
      domain: original.domain,
      status: "in-progress",
      about: original.about,
      files: original.files,
      userId: req.user.id,
      remixedFrom: original._id
    });

    original.remixCount = (original.remixCount || 0) + 1;
    await original.save();

    await Activity.create({
      userId: req.user.id,
      type: "remixed",
      projectId: remixed._id,
      targetId: original._id,
      meta: original.title
    });

    const populated = await remixed.populate("userId", "username avatar");
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /projects/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Not found" });
    if (project.userId.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });
    await project.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /projects/:id/like
router.post("/:id/like", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Not found" });
    const userId = req.user.id;
    const alreadyLiked = project.likes.map(id => id.toString()).includes(userId);
    if (alreadyLiked) {
      project.likes = project.likes.filter(id => id.toString() !== userId);
    } else {
      project.likes.push(userId);
      await Activity.create({ userId, type: "liked", projectId: project._id, targetId: project.userId });
    }
    await project.save();
    res.json({ likes: project.likes.length, liked: !alreadyLiked });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /projects/:id/comments
router.post("/:id/comments", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Not found" });
    project.comments.push({ userId: req.user.id, text: req.body.text });
    await project.save();
    await Activity.create({ userId: req.user.id, type: "commented", projectId: project._id });
    await project.populate("comments.userId", "username avatar");
    res.json(project.comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /projects/:id/comments/:commentId
router.delete("/:id/comments/:commentId", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Not found" });
    const comment = project.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.userId.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });
    comment.deleteOne();
    await project.save();
    res.json({ message: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
