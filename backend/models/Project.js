const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const aboutSchema = new mongoose.Schema({
  features:    { type: String, default: "" },
  howItWorks:  { type: String, default: "" },
  futurePlans: { type: String, default: "" }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  title:        { type: String, required: true },
  description:  { type: String, required: true },
  codeSnippet:  { type: String, default: "" },
  about:        { type: aboutSchema, default: () => ({}) },
  status:       { type: String, enum: ["completed", "in-progress", "idea"], default: "idea" },
  tags:         [{ type: String }],
  domain:       { type: String, default: "" },
  files:        [{ name: String, path: String, size: Number }],
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  likes:        [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments:     [commentSchema],
  remixedFrom:  { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
  remixCount:   { type: Number, default: 0 },
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model("Project", projectSchema);
