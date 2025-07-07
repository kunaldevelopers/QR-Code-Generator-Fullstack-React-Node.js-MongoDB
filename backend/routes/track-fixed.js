const express = require("express");
const router = express.Router();
const path = require("path");
const QRCode = require("../models/QRCode");
const geoip = require("geoip-lite");
const { recordScan, isQrCodeExpired } = require("../utils/analytics");

// Handle direct URL access with query parameters
router.get("/:qrCodeId", async (req, res) => {
  const qrCodeId = req.params.qrCodeId;

  // Clean and validate qrCodeId
  // QR code IDs should be MongoDB ObjectIds (24 hex chars)
  // If not a valid ObjectId, it might be a tracking ID or something else
  let cleanQrCodeId = qrCodeId.replace(/[^a-zA-Z0-9_-]/g, "");

  // Extract the ObjectId if it's embedded in the URL path
  const objectIdMatch = cleanQrCodeId.match(/([0-9a-f]{24})/i);
  if (objectIdMatch) {
    cleanQrCodeId = objectIdMatch[1];
  }

  // If there are query parameters that include password, use the redirect handler
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
  console.log("Track route hit with params:", req.params);

  try {
    // Extract and clean parameters
    let { qrCodeId, trackingId } = req.params;

    // If trackingId contains a colon (like "abc:123"), clean it
    if (trackingId && trackingId.includes(":")) {
      trackingId = trackingId.split(":")[0];
    }

    // Ensure qrCodeId is a valid MongoDB ObjectId
    if (!qrCodeId || !/^[0-9a-f]{24}$/i.test(qrCodeId)) {
      console.log("Invalid QR code ID format:", qrCodeId);
      return res.status(400).send(`
        <html>
          <body style="text-align:center;font-family:Arial;padding:20px;">
            <h2>⚠️ Invalid QR Code</h2>
            <p>The QR code format is invalid.</p>
          </body>
        </html>
      `);
    }

    console.log(
      "Processing scan for QR Code ID:",
      qrCodeId,
      "Tracking ID:",
      trackingId
    );

    const qrCode = await QRCode.findById(qrCodeId);
    console.log("Found QR Code:", qrCode ? "Yes" : "No");

    // Check if QR code exists
    if (!qrCode) {
      console.log("QR Code not found");
      return res.send(
        "<html>" +
          "<head><title>QR Code Not Found</title></head>" +
          '<body style="text-align:center;font-family:Arial;padding:20px;">' +
          "<h2>⚠️ QR Code Not Found</h2>" +
          "<p>This QR code does not exist or has been deleted.</p>" +
          "</body>" +
          "</html>"
      );
    }

    // Unified check for expiry (both date and max scans)
    const expired = await isQrCodeExpired(qrCode);
    if (expired) {
      // Determine reason for expiration
      const isDateExpired =
        qrCode.security.expiresAt &&
        new Date() > new Date(qrCode.security.expiresAt);
      const isMaxScansReached =
        qrCode.security.maxScans > 0 &&
        qrCode.analytics.scanCount >= qrCode.security.maxScans;

      let message = "This QR code has expired and is no longer valid.";
      let title = "QR Code Expired";

      if (isMaxScansReached) {
        message =
          "This QR code has reached its maximum number of allowed scans.";
        title = "Scan Limit Reached";
      }

      console.log(
        `QR Code expired: ${isDateExpired ? "date expired" : ""} ${
          isMaxScansReached ? "max scans reached" : ""
        }`
      );

      return res.send(
        "<html>" +
          `<head><title>${title}</title></head>` +
          '<body style="text-align:center;font-family:Arial;padding:20px;">' +
          `<h2>⚠️ ${title}</h2>` +
          `<p>${message}</p>` +
          "</body>" +
          "</html>"
      );
    }

    // For password protected QR codes, show password form
    if (qrCode.security && qrCode.security.isPasswordProtected) {
      // Use the password-verify.html file instead of inline HTML to avoid template literal issues
      return res.sendFile(
        path.join(__dirname, "../public/password-verify.html")
      );
    }

    /* 
    // This is a redundant check - the expiration is already checked above
    // Check expiration (already done above, this is redundant but we'll keep it for safety)
    if (expired) {
      console.log("QR Code expired");
      return res.send(
        "<html>" +
          '<body style="text-align:center;font-family:Arial;padding:20px;">' +
          "<h2>⚠️ QR Code Expired</h2>" +
          "<p>This QR code has expired or reached its maximum scan limit.</p>" +
          "</body>" +
          "</html>"
      );
    }
    */

    // Get IP and location info
    let ip = req.ip || req.connection.remoteAddress;
    // Remove IPv6 prefix if present
    ip = ip.replace(/^::ffff:/, "");

    console.log("Client IP:", ip);

    // Get location data from IP
    const geo = geoip.lookup(ip);
    console.log("Geolocation data:", geo);

    const locationData = {
      country: geo ? geo.country : "Unknown",
      city: geo ? geo.city : "Unknown",
    };

    console.log("Location data:", locationData);

    // If not password protected, record scan and redirect
    console.log("Recording scan for non-password protected QR code");

    try {
      const scanData = {
        userAgent: req.headers["user-agent"],
        ip: ip,
        referer: req.headers.referer,
        trackingId,
        country: locationData.country,
        city: locationData.city,
      };

      console.log("Scan data:", scanData);

      const updatedQrCode = await recordScan(qrCodeId, scanData);

      if (!updatedQrCode) {
        console.log("Failed to record scan - recordScan returned null");
        // Continue with redirect even if scan recording fails
      } else {
        console.log(
          "Scan recorded successfully. New scan count:",
          updatedQrCode.analytics.scanCount
        );
      }
    } catch (scanError) {
      console.error("Error recording scan:", scanError);
      // Continue with redirect even if scan recording fails
    }

    // Redirect to destination URL
    console.log("Redirecting to:", qrCode.text);
    res.redirect(qrCode.text);
  } catch (error) {
    console.error("Error handling QR scan:", error);
    res
      .status(500)
      .send(
        "<html>" +
          '<body style="text-align:center;font-family:Arial;padding:20px;">' +
          "<h2>⚠️ Error</h2>" +
          "<p>An error occurred while processing this QR code. Please try again later.</p>" +
          "</body>" +
          "</html>"
      );
  }
});

module.exports = router;
