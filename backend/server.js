const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ✅ Middleware FIRST — CORS must be before everything
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", require("express").static(require("path").join(__dirname, "uploads")));

// ✅ Routes AFTER middleware
const projectRoutes = require("./routes/projectRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const activityRoutes = require("./routes/activityRoutes");
app.use("/projects", projectRoutes);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/activity", activityRoutes);

// 🔌 MongoDB Connection
//mongoose.connect("mongodb+srv://dasmiita:LD34ehb4zL.FjbL@vibegit.ksnhxcx.mongodb.net/mongodb.net/vibegit") 
mongoose.connect("mongodb+srv://dasmiita:innu2013@vibegit.ksnhxcx.mongodb.net/vibegit")
  .then(() => console.log("MongoDB connected ✅"))
  .catch(err => console.log(err));

// Test route
app.get("/", (req, res) => {
  res.send("API Running 🚀");
});

app.listen(5000, () => console.log("Server running on port 5000"));