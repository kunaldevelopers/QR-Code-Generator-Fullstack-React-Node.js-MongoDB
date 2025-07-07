/**
 * Routes for QR code analytics and tracking
 */

const express = require("express");
const router = express.Router();
const QRCode = require("../models/QRCode");
const authMiddleware = require("../middleware/auth");
const {
  recordScan,
  getAnalytics,
  isQrCodeExpired,
} = require("../utils/analytics");

// Track QR code scan (no auth required)
router.get("/track/:qrCodeId/:trackingId", async (req, res) => {
  try {
    const { qrCodeId, trackingId } = req.params;
    console.log("Tracking scan for QR Code:", { qrCodeId, trackingId });

    const qrCode = await QRCode.findById(qrCodeId);
    if (!qrCode) {
      console.log("QR Code not found");
      return res.status(404).json({ error: "QR code not found" });
    }

    // Check expiration and scan limit before proceeding
    console.log("Current QR code state:", {
      currentScans: qrCode.analytics?.scanCount || 0,
      maxScans: qrCode.security?.maxScans || 0,
      expiresAt: qrCode.security?.expiresAt,
      isExpired: qrCode.expired,
    });

    const expired = await isQrCodeExpired(qrCode);
    if (expired) {
      console.log("QR Code expired or reached limit:", {
        reason: qrCode.expired
          ? "marked as expired"
          : qrCode.security?.maxScans > 0 &&
            qrCode.analytics?.scanCount >= qrCode.security?.maxScans
          ? "scan limit reached"
          : qrCode.security?.expiresAt &&
            new Date() > new Date(qrCode.security?.expiresAt)
          ? "date expired"
          : "unknown",
      });
      return res.json({
        expired: true,
        message: "This QR code has expired or reached maximum scans",
      });
    }

    // For password protected QR codes, return requiresPassword flag
    if (qrCode.security?.isPasswordProtected) {
      console.log("QR Code requires password");
      return res.json({
        requiresPassword: true,
        qrCodeId,
        trackingId,
      });
    }

    // Record scan for non-password protected codes
    const scanData = {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      referer: req.headers.referer,
      country: "Unknown",
      city: "Unknown",
    };

    console.log("Recording scan...");
    const updatedQrCode = await recordScan(qrCodeId, scanData);

    if (!updatedQrCode) {
      console.log("Failed to record scan or limit reached");
      return res.json({
        expired: true,
        message: "This QR code has expired or reached maximum scans",
      });
    }

    console.log("Scan recorded successfully. Stats:", {
      scans: updatedQrCode.analytics.scanCount,
      maxScans: updatedQrCode.security.maxScans,
      remaining:
        updatedQrCode.security.maxScans > 0
          ? updatedQrCode.security.maxScans - updatedQrCode.analytics.scanCount
          : "unlimited",
    });
    res.json({
      success: true,
      qrCode: {
        text: updatedQrCode.text,
        type: updatedQrCode.qrType,
        analytics: {
          scanCount: updatedQrCode.analytics.scanCount,
          maxScans: updatedQrCode.security.maxScans,
          remainingScans:
            updatedQrCode.security.maxScans > 0
              ? updatedQrCode.security.maxScans -
                updatedQrCode.analytics.scanCount
              : null,
        },
      },
    });
  } catch (error) {
    console.error("Error tracking scan:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Verify password for password-protected QR code
router.post("/verify-password/:qrCodeId", async (req, res) => {
  try {
    const { qrCodeId } = req.params;
    const { password } = req.body;

    console.log("Password verification attempt for QR:", qrCodeId);

    const qrCode = await QRCode.findById(qrCodeId);
    if (!qrCode) {
      console.log("QR code not found");
      return res.status(404).json({ error: "QR code not found" });
    }
    if (!qrCode.security?.isPasswordProtected) {
      console.log("QR code is not password protected");
      return res
        .status(400)
        .json({ error: "This QR code is not password protected" });
    }

    // Check expiration and scan limit before verifying password
    console.log("Current QR code state (password route):", {
      currentScans: qrCode.analytics?.scanCount || 0,
      maxScans: qrCode.security?.maxScans || 0,
      expiresAt: qrCode.security?.expiresAt,
      isExpired: qrCode.expired,
    });

    const expired = await isQrCodeExpired(qrCode);
    if (expired) {
      console.log("QR code expired or reached limit:", {
        reason: qrCode.expired
          ? "marked as expired"
          : qrCode.security?.maxScans > 0 &&
            qrCode.analytics?.scanCount >= qrCode.security?.maxScans
          ? "scan limit reached"
          : qrCode.security?.expiresAt &&
            new Date() > new Date(qrCode.security?.expiresAt)
          ? "date expired"
          : "unknown",
      });
      return res.status(410).json({
        expired: true,
        message: "This QR code has expired or reached maximum scans",
      });
    }

    if (!password) {
      console.log("No password provided");
      return res.status(401).json({ error: "Password is required" });
    } // Compare passwords with proper validation and trimming
    const providedPassword = password?.trim() || "";
    const storedPassword = qrCode.security.password?.trim() || "";

    console.log("Comparing passwords (not showing actual passwords)");

    if (storedPassword !== providedPassword) {
      console.log("Password mismatch");
      return res.status(401).json({
        error: "The password you entered is incorrect. Please try again.",
      });
    }

    console.log("Password verified successfully");

    // Record scan after successful password verification
    const scanData = {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      referer: req.headers.referer,
      country: "Unknown",
      city: "Unknown",
    };

    const updatedQrCode = await recordScan(qrCodeId, scanData);
    if (!updatedQrCode) {
      console.log(
        "Failed to record scan or limit reached after password verification"
      );
      return res.json({
        expired: true,
        message: "This QR code has reached its maximum number of scans",
      });
    }

    console.log(
      "Scan recorded successfully after password verification. Stats:",
      {
        scans: updatedQrCode.analytics.scanCount,
        maxScans: updatedQrCode.security.maxScans,
        remaining:
          updatedQrCode.security.maxScans > 0
            ? updatedQrCode.security.maxScans -
              updatedQrCode.analytics.scanCount
            : "unlimited",
      }
    );

    res.json({
      success: true,
      redirectUrl: qrCode.text,
      message: "Password verified successfully",
      qrCode: {
        text: qrCode.text,
        type: qrCode.qrType,
        analytics: {
          scanCount: updatedQrCode.analytics.scanCount,
          maxScans: updatedQrCode.security.maxScans,
          remainingScans:
            updatedQrCode.security.maxScans > 0
              ? updatedQrCode.security.maxScans -
                updatedQrCode.analytics.scanCount
              : null,
        },
      },
    });
  } catch (error) {
    console.error("Error verifying password:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get analytics for all user's QR codes (requires auth)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const analytics = await getAnalytics(null, userId);

    if (!analytics) {
      return res.status(404).json({ error: "No analytics found" });
    }

    res.json(analytics);
  } catch (error) {
    console.error("Error getting analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get dashboard analytics (requires auth)
router.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all QR codes for the user
    const qrCodes = await QRCode.find({ userId }).sort({ createdAt: -1 });

    // Calculate dashboard statistics
    const totalQRCodes = qrCodes.length;
    const totalScans = qrCodes.reduce(
      (sum, qr) => sum + (qr.analytics?.scanCount || 0),
      0
    );

    // This month's statistics
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthQRs = qrCodes.filter(
      (qr) => new Date(qr.createdAt) >= thisMonthStart
    );
    const thisMonthScans = thisMonthQRs.reduce(
      (sum, qr) => sum + (qr.analytics?.scanCount || 0),
      0
    );

    // QR code types distribution
    const typeDistribution = qrCodes.reduce((acc, qr) => {
      acc[qr.qrType] = (acc[qr.qrType] || 0) + 1;
      return acc;
    }, {});

    // Top performing QR codes
    const topQRCodes = qrCodes
      .sort(
        (a, b) => (b.analytics?.scanCount || 0) - (a.analytics?.scanCount || 0)
      )
      .slice(0, 5)
      .map((qr) => ({
        id: qr._id,
        text: qr.text,
        type: qr.qrType,
        scans: qr.analytics?.scanCount || 0,
        createdAt: qr.createdAt,
      }));

    // Recent activity (last 5 QR codes)
    const recentActivity = qrCodes.slice(0, 5).map((qr) => ({
      id: qr._id,
      text: qr.text,
      type: qr.qrType,
      scans: qr.analytics?.scanCount || 0,
      createdAt: qr.createdAt,
    }));

    const dashboardData = {
      totalQRCodes,
      totalScans,
      thisMonthQRCodes: thisMonthQRs.length,
      thisMonthScans,
      typeDistribution,
      topQRCodes,
      recentActivity,
    };

    res.json(dashboardData);
  } catch (error) {
    console.error("Error getting dashboard analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get analytics for a specific QR code (requires auth)
router.get("/:qrCodeId", authMiddleware, async (req, res) => {
  try {
    const { qrCodeId } = req.params;
    const userId = req.user.userId;

    const qrCode = await QRCode.findOne({ _id: qrCodeId, userId });
    if (!qrCode) {
      return res
        .status(404)
        .json({ error: "QR code not found or unauthorized" });
    }

    const analytics = await getAnalytics(qrCodeId);
    if (!analytics) {
      return res
        .status(404)
        .json({ error: "No analytics found for this QR code" });
    }

    res.json(analytics);
  } catch (error) {
    console.error("Error getting QR code analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
