require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

// Import routes
const trackRoutes = require("./routes/track-fixed"); // Using fixed version of track.js
const analyticsRoutes = require("./routes/analytics");
const QRCode = require("./models/QRCode");
const authRoutes = require("./routes/auth");
const qrCodeRoutes = require("./routes/qrcode");
const authMiddleware = require("./middleware/auth");

const app = express();

// Middleware
// Configure CORS to allow requests from both local and production frontend
app.use(
  cors({
    origin: ["http://localhost:5173", "https://qr-code-advance.netlify.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
// Increase payload size limit to 50MB for handling large QR code images and bulk operations
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static files (logos)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/qrcodes", qrCodeRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/track", trackRoutes);

// Legacy route for backwards compatibility
app.post("/api/qrcodes-legacy", authMiddleware, async (req, res) => {
  try {
    const { text, qrImage } = req.body;
    const userId = req.user.userId; // Get userId from auth middleware

    const qrCode = new QRCode({
      userId,
      text,
      qrImage,
    });
    await qrCode.save();
    res.status(201).json(qrCode);
  } catch (error) {
    res.status(500).json({ error: "Error creating QR code" });
  }
});

app.get("/api/qrcodes", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId; // Get userId from auth middleware
    const qrCodes = await QRCode.find({ userId }).sort({
      createdAt: -1,
    });
    res.json(qrCodes);
  } catch (error) {
    res.status(500).json({ error: "Error fetching QR codes" });
  }
});

app.delete("/api/qrcodes/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    // Only allow deletion if the QR code belongs to the authenticated user
    const qrCode = await QRCode.findOne({ _id: req.params.id, userId });

    if (!qrCode) {
      return res
        .status(404)
        .json({ error: "QR code not found or unauthorized" });
    }

    await QRCode.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Error deleting QR code" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
