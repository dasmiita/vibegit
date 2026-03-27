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

// GET /projects
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

    // Exclude projects from private users
    const User = require("../models/User");
    const privateUsers = await User.find({ isPrivate: true }).select("_id");
    const privateIds = privateUsers.map(u => u._id);
    if (privateIds.length) query.userId = { $nin: privateIds };

    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .populate("userId", "username avatar")
      .populate("remixedFrom", "title userId");
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /projects
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

// ── All specific /:id/sub-routes MUST come before GET /:id ──

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

// POST /projects/:id/sync-request — user sends their proposed changes TO the original
router.post("/:id/sync-request", auth, async (req, res) => {
  try {
    console.log("SYNC REQUEST HIT", req.params.id, "by user", req.user.id);
    const original = await Project.findById(req.params.id);
    if (!original) return res.status(404).json({ message: "Project not found" });

    const originalOwnerId = original.userId?._id?.toString() || original.userId?.toString();
    if (originalOwnerId === req.user.id)
      return res.status(400).json({ message: "Cannot sync to your own project" });

    // Check no pending request already exists from this user
    const alreadyPending = (original.syncRequests || []).some(
      r => r.requestedBy.toString() === req.user.id && r.status === "pending"
    );
    if (alreadyPending)
      return res.status(400).json({ message: "You already have a pending sync request" });

    // Find user's remix if it exists, otherwise use their userId as reference
    const remix = await Project.findOne({ remixedFrom: req.params.id, userId: req.user.id });

    if (!Array.isArray(original.syncRequests)) original.syncRequests = [];
    original.syncRequests.push({
      remixId:     remix ? remix._id : null,
      requestedBy: req.user.id
    });
    await original.save();

    await Activity.create({
      userId:    req.user.id,
      type:      "sync_requested",
      projectId: original._id,
      targetId:  original._id,
      meta:      original.title
    });

    res.json({ message: "Sync request sent to the original creator" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /projects/:id/sync-requests — original creator views pending requests
router.get("/:id/sync-requests", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("syncRequests.remixId", "title userId updatedAt description codeSnippet about tags domain")
      .populate("syncRequests.requestedBy", "username avatar");
    if (!project) return res.status(404).json({ message: "Not found" });

    const ownerId = project.userId?._id?.toString() || project.userId?.toString();
    if (ownerId !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    const pending = (project.syncRequests || []).filter(r => r.status === "pending");
    res.json(pending);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /projects/:id/sync-request/:reqId/respond — approve copies remix changes INTO original
router.post("/:id/sync-request/:reqId/respond", auth, async (req, res) => {
  try {
    const { action } = req.body;
    if (!["approve", "decline"].includes(action))
      return res.status(400).json({ message: "action must be approve or decline" });

    const original = await Project.findById(req.params.id);
    if (!original) return res.status(404).json({ message: "Not found" });

    const ownerId = original.userId?._id?.toString() || original.userId?.toString();
    if (ownerId !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    const syncReq = original.syncRequests?.id(req.params.reqId);
    if (!syncReq) return res.status(404).json({ message: "Sync request not found" });
    if (syncReq.status !== "pending")
      return res.status(400).json({ message: "Request already responded to" });

    syncReq.status = action === "approve" ? "approved" : "declined";

    if (action === "approve") {
      // Get the source of changes: remix if exists, otherwise find any project by the requester
      let source = syncReq.remixId ? await Project.findById(syncReq.remixId) : null;
      if (!source) {
        // Fall back to the most recently updated project by the requester
        source = await Project.findOne({ userId: syncReq.requestedBy }).sort({ updatedAt: -1 });
      }

      if (source) {
        if (!Array.isArray(original.versions)) original.versions = [];
        if (!original.currentVersion) original.currentVersion = 1;

        // Snapshot original's current state first
        original.versions.push({
          versionNumber: original.currentVersion,
          title:         original.title,
          description:   original.description,
          codeSnippet:   original.codeSnippet || "",
          about:         { features: original.about?.features || "", howItWorks: original.about?.howItWorks || "", futurePlans: original.about?.futurePlans || "" },
          status:        original.status || "idea",
          tags:          original.tags || [],
          domain:        original.domain || "",
          editedAt:      original.updatedAt || original.createdAt
        });

        // Apply source's content to original
        original.title       = source.title.replace(" (Remix)", "").trim();
        original.description = source.description;
        original.codeSnippet = source.codeSnippet;
        original.about       = source.about;
        original.tags        = source.tags;
        original.domain      = source.domain;
        original.currentVersion += 1;
        original.updatedAt   = new Date();
      }

      await Activity.create({
        userId: req.user.id,
        type: "sync_approved",
        projectId: original._id,
        targetId: syncReq.remixId,
        meta: original.title
      });
    }

    await original.save();
    res.json({ message: action === "approve" ? "Sync approved — original project updated with remix changes" : "Sync declined" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Generic /:id routes LAST ──

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

// PUT /projects/:id
router.put("/:id", auth, upload.array("files", 10), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Not found" });

    const ownerId = project.userId?._id?.toString() || project.userId?.toString();
    if (ownerId !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    if (!Array.isArray(project.versions)) project.versions = [];
    if (!project.currentVersion) project.currentVersion = 1;

    project.versions.push({
      versionNumber: project.currentVersion,
      title:         project.title,
      description:   project.description,
      codeSnippet:   project.codeSnippet || "",
      about:         { features: project.about?.features || "", howItWorks: project.about?.howItWorks || "", futurePlans: project.about?.futurePlans || "" },
      status:        project.status  || "idea",
      tags:          project.tags    || [],
      domain:        project.domain  || "",
      editedAt:      project.updatedAt || project.createdAt
    });

    const { title, description, codeSnippet, tags, status, domain, features, howItWorks, futurePlans } = req.body;
    const newFiles = (req.files || []).map(f => ({ name: f.originalname, path: f.filename, size: f.size }));

    if (title)       project.title       = title;
    if (description) project.description = description;
    if (codeSnippet !== undefined) project.codeSnippet = codeSnippet;
    if (status)      project.status      = status;
    if (domain !== undefined) project.domain = domain;
    if (tags)        project.tags        = JSON.parse(tags);
    project.about = {
      features:    features    !== undefined ? features    : (project.about?.features    || ""),
      howItWorks:  howItWorks  !== undefined ? howItWorks  : (project.about?.howItWorks  || ""),
      futurePlans: futurePlans !== undefined ? futurePlans : (project.about?.futurePlans || "")
    };
    if (newFiles.length > 0) project.files = [...(project.files || []), ...newFiles];
    project.currentVersion += 1;
    project.updatedAt = new Date();

    await project.save();
    const populated = await project.populate("userId", "username avatar");
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

module.exports = router;
