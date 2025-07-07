const express = require("express");
const router = express.Router();
const path = require("path");
const QRCode = require("../models/QRCode");
const { recordScan, isQrCodeExpired } = require("../utils/analytics");
const geoip = require("geoip-lite");

// Handle direct URL access with query parameters
router.get("/:qrCodeId", async (req, res) => {
  const qrCodeId = req.params.qrCodeId;

  // Clean qrCodeId to prevent any script injection or parsing issues
  const cleanQrCodeId = qrCodeId.replace(/[^a-zA-Z0-9_-]/g, "");
  // If there are query parameters that include password, use the fixed redirect handler
  if (req.query.password || req.query.trackingId) {
    console.log("Processing QR code with query parameters");
    return res.sendFile(
      path.join(__dirname, "../public/password-redirect-fix.html")
    );
  }

  // Otherwise, redirect to the regular scan handler
  console.log("Redirecting to scanner with QR ID:", cleanQrCodeId);
  res.redirect(`/track/${cleanQrCodeId}/direct`);
});

// Handle QR code scans
router.get("/:qrCodeId/:trackingId", async (req, res) => {
  try {
    const { qrCodeId, trackingId } = req.params;
    console.log("[Track] Scan request received:", { qrCodeId, trackingId });

    // Get QR code with population
    const qrCode = await QRCode.findById(qrCodeId);
    console.log("[Track] QR Code found:", qrCode ? "Yes" : "No");

    if (!qrCode) {
      console.log("[Track] QR Code not found");
      return res.status(404).send(`
        <html>
          <head><title>QR Code Not Found</title></head>
          <body style="text-align:center;font-family:Arial;padding:20px;">
            <h2>⚠️ QR Code Not Found</h2>
            <p>This QR code does not exist or has been deleted.</p>
          </body>
        </html>
      `);
    }

    console.log("[Track] Current QR Code state:", {
      isPasswordProtected: qrCode.security?.isPasswordProtected,
      expiresAt: qrCode.security?.expiresAt,
      maxScans: qrCode.security?.maxScans,
      currentScans: qrCode.analytics?.scanCount,
      expired: qrCode.expired,
    });

    // Check expiration and scan limit
    const expired = await isQrCodeExpired(qrCode);
    console.log("[Track] Expiration check result:", expired);

    if (expired) {
      console.log("[Track] QR Code is expired or at scan limit");
      return res.status(410).send(`
        <html>
          <head><title>QR Code Expired</title></head>
          <body style="text-align:center;font-family:Arial;padding:20px;">
            <h2>⚠️ QR Code Expired</h2>
            <p>This QR code has expired or reached its maximum scan limit.</p>
          </body>
        </html>
      `);
    }

    // For password protected QR codes, show password form
    if (qrCode.security?.isPasswordProtected) {
      console.log("[Track] QR Code is password protected, showing form");
      return res.sendFile(
        path.join(__dirname, "../public/password-verify.html")
      );
    }

    // Get IP and location info
    let ip = req.ip || req.connection.remoteAddress;
    ip = ip.replace(/^::ffff:/, "");
    console.log("[Track] Client IP:", ip);

    // Get location data
    const geo = geoip.lookup(ip);
    const locationData = {
      country: geo ? geo.country : "Unknown",
      city: geo ? geo.city : "Unknown",
    };
    console.log("[Track] Location data:", locationData);

    // Record scan
    console.log("[Track] Recording scan...");
    const updatedQrCode = await recordScan(qrCodeId, {
      userAgent: req.headers["user-agent"],
      ip: ip,
      referer: req.headers.referer,
      ...locationData,
    });

    if (!updatedQrCode) {
      console.log("[Track] Failed to record scan, possible limit reached");
      return res.status(429).send(`
        <html>
          <head><title>Scan Limit Reached</title></head>
          <body style="text-align:center;font-family:Arial;padding:20px;">
            <h2>⚠️ Scan Limit Reached</h2>
            <p>This QR code has reached its maximum number of allowed scans.</p>
          </body>
        </html>
      `);
    }

    // All good, redirect to the content
    console.log(
      "[Track] Scan recorded successfully, redirecting to:",
      qrCode.text
    );
    res.redirect(qrCode.text);
  } catch (error) {
    console.error("[Track] Error:", error);
    res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body style="text-align:center;font-family:Arial;padding:20px;">
          <h2>⚠️ Error</h2>
          <p>An error occurred while processing this QR code.</p>
        </body>
      </html>
    `);
  }
});

module.exports = router;
