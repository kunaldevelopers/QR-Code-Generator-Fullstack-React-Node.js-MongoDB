const express = require("express");
const router = express.Router();
const path = require("path");
const QRCode = require("../models/QRCode");
const { recordScan, isQrCodeExpired } = require("../utils/analytics");
const geoip = require("geoip-lite");

// Generate landing page for non-URL QR codes
function generateLandingPage(qrCode) {
  const { qrType, text } = qrCode;

  let content = "";
  let title = "QR Code Content";

  switch (qrType) {
    case "text":
      title = "Text Message";
      content = `
        <div class="content-box">
          <h3>📝 Text Message</h3>
          <div class="text-content">${escapeHtml(text)}</div>
          <button onclick="copyToClipboard('${escapeHtml(
            text
          )}')" class="copy-btn">📋 Copy Text</button>
        </div>
      `;
      break;

    case "vcard":
      title = "Contact Information";
      content = `
        <div class="content-box">
          <h3>👤 Contact Information</h3>
          <div class="vcard-content">
            <pre>${escapeHtml(text)}</pre>
          </div>
          <p class="instruction">Save this contact to your phone by scanning the QR code with your camera app.</p>
        </div>
      `;
      break;

    case "wifi":
      title = "WiFi Network";
      content = `
        <div class="content-box">
          <h3>📶 WiFi Network</h3>
          <div class="wifi-content">
            <pre>${escapeHtml(text)}</pre>
          </div>
          <p class="instruction">Connect to this WiFi network by scanning the QR code with your camera app.</p>
        </div>
      `;
      break;

    case "email":
      title = "Email";
      if (text.startsWith("mailto:")) {
        content = `
          <div class="content-box">
            <h3>✉️ Email</h3>
            <div class="email-content">
              <a href="${escapeHtml(text)}" class="email-link">Open Email</a>
            </div>
          </div>
        `;
      } else {
        content = `
          <div class="content-box">
            <h3>✉️ Email</h3>
            <div class="text-content">${escapeHtml(text)}</div>
          </div>
        `;
      }
      break;

    case "sms":
      title = "SMS";
      if (text.startsWith("sms:")) {
        content = `
          <div class="content-box">
            <h3>💬 SMS</h3>
            <div class="sms-content">
              <a href="${escapeHtml(text)}" class="sms-link">Send SMS</a>
            </div>
          </div>
        `;
      } else {
        content = `
          <div class="content-box">
            <h3>💬 SMS</h3>
            <div class="text-content">${escapeHtml(text)}</div>
          </div>
        `;
      }
      break;

    case "geo":
      title = "Location";
      if (text.startsWith("geo:")) {
        const coords = text.replace("geo:", "").split(",");
        content = `
          <div class="content-box">
            <h3>📍 Location</h3>
            <div class="geo-content">
              <p>Latitude: ${coords[0] || "Unknown"}</p>
              <p>Longitude: ${coords[1] || "Unknown"}</p>
              <a href="${escapeHtml(text)}" class="geo-link">Open in Maps</a>
            </div>
          </div>
        `;
      } else {
        content = `
          <div class="content-box">
            <h3>📍 Location</h3>
            <div class="text-content">${escapeHtml(text)}</div>
          </div>
        `;
      }
      break;

    case "event":
      title = "Calendar Event";
      content = `
        <div class="content-box">
          <h3>📅 Calendar Event</h3>
          <div class="event-content">
            <pre>${escapeHtml(text)}</pre>
          </div>
          <p class="instruction">Add this event to your calendar by scanning the QR code with your camera app.</p>
        </div>
      `;
      break;

    case "url":
    default:
      // Handle URLs that don't have proper protocol
      if (text.includes(".") && !text.startsWith("http")) {
        const urlWithProtocol = `https://${text}`;
        content = `
          <div class="content-box">
            <h3>🔗 Website</h3>
            <div class="url-content">
              <a href="${escapeHtml(
                urlWithProtocol
              )}" target="_blank" class="url-link">${escapeHtml(text)}</a>
            </div>
          </div>
        `;
      } else {
        content = `
          <div class="content-box">
            <h3>📄 Content</h3>
            <div class="text-content">${escapeHtml(text)}</div>
          </div>
        `;
      }
      break;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 20px auto;
            padding: 20px;
            background: #f5f5f5;
            line-height: 1.6;
          }
          .content-box {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
          }
          h3 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.5em;
          }
          .text-content {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            word-break: break-word;
            font-size: 1.1em;
          }
          .vcard-content, .wifi-content, .event-content {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: left;
            font-family: monospace;
            font-size: 14px;
            overflow-x: auto;
          }
          .instruction {
            color: #666;
            font-style: italic;
            margin-top: 15px;
          }
          .copy-btn, .email-link, .sms-link, .geo-link, .url-link {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 10px;
            border: none;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.3s;
          }
          .copy-btn:hover, .email-link:hover, .sms-link:hover, .geo-link:hover, .url-link:hover {
            background: #0056b3;
          }
          .geo-content p {
            margin: 5px 0;
            font-weight: bold;
          }
          pre {
            white-space: pre-wrap;
            word-break: break-word;
          }
        </style>
      </head>
      <body>
        ${content}
        <script>
          function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(function() {
              alert('Text copied to clipboard!');
            }).catch(function() {
              alert('Unable to copy text');
            });
          }
        </script>
      </body>
    </html>
  `;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = { innerHTML: "" };
  div.textContent = text;
  return (
    div.innerHTML ||
    text.replace(/[&<>"']/g, function (m) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m];
    })
  );
}

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

    // All good, handle redirection based on QR type
    console.log(
      "[Track] Scan recorded successfully, processing QR type:",
      qrCode.qrType
    );

    // For URL types, redirect directly
    if (
      qrCode.qrType === "url" &&
      (qrCode.text.startsWith("http://") || qrCode.text.startsWith("https://"))
    ) {
      console.log("[Track] Redirecting to URL:", qrCode.text);
      res.redirect(qrCode.text);
    } else {
      // For non-URL types or URLs without protocol, show a landing page
      console.log("[Track] Showing landing page for QR type:", qrCode.qrType);
      res.send(generateLandingPage(qrCode));
    }
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
