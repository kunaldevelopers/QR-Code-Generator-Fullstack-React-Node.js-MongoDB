/**
 * Routes for QR code generation and management
 */

const express = require("express");
const router = express.Router();
const QRCodeModel = require("../models/QRCode");
const QRCode = require("qrcode");
const authMiddleware = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const Jimp = require("jimp"); // Changed from require("jimp").default
const mongoose = require("mongoose");
const qrTypeFormatter = require("../utils/qrTypeFormatter");
const { createTrackingUrl } = require("../utils/analytics");

// Configure file upload for logos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/logos");
    fs.ensureDirSync(uploadDir); // Create directory if it doesn't exist
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "logo-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 2 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|svg/; // Re-enabled SVG with proper handling
    const ext = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mime = allowedTypes.test(file.mimetype);

    if (ext && mime) {
      return cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and SVG files are allowed"));
    }
  },
});

// Get all QR codes for a user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const qrCodes = await QRCodeModel.find({ userId }).sort({ createdAt: -1 });
    res.json(qrCodes);
  } catch (error) {
    console.error("Error getting QR codes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get a specific QR code
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const qrCode = await QRCodeModel.findOne({ _id: id, userId });

    if (!qrCode) {
      return res
        .status(404)
        .json({ error: "QR code not found or unauthorized" });
    }

    res.json(qrCode);
  } catch (error) {
    console.error("Error getting QR code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new QR code
router.post("/", authMiddleware, upload.single("logo"), async (req, res) => {
  try {
    const userId = req.user.userId;

    // Parse JSON strings from FormData
    let customization = {};
    let security = {};
    let tags = [];

    try {
      customization = req.body.customization
        ? JSON.parse(req.body.customization)
        : {};
    } catch (e) {
      console.error("Error parsing customization:", e);
      customization = {};
    }

    try {
      security = req.body.security ? JSON.parse(req.body.security) : {};
    } catch (e) {
      console.error("Error parsing security:", e);
      security = {};
    }

    try {
      tags = req.body.tags ? JSON.parse(req.body.tags) : [];
    } catch (e) {
      console.error("Error parsing tags:", e);
      tags = [];
    }

    const {
      text,
      qrType = "url",
      enableTracking: rawEnableTracking,
    } = req.body;

    // Convert enableTracking to boolean since it might come as string from FormData
    // Default to true if not provided or if it's undefined
    const enableTracking =
      rawEnableTracking === undefined
        ? true
        : rawEnableTracking === "true" || rawEnableTracking === true;

    // Debug log the security object

    // Validate and process security options
    const securitySettings = {
      isPasswordProtected: Boolean(security.isPasswordProtected),
      password: security.isPasswordProtected
        ? (security.password || "").trim()
        : "",
      expiresAt: security.expiresAt ? new Date(security.expiresAt) : null,
      maxScans: parseInt(security.maxScans) || 0,
    };

    // Validate password if protection is enabled
    if (securitySettings.isPasswordProtected) {
      if (
        !securitySettings.password ||
        securitySettings.password.trim() === ""
      ) {
        return res.status(400).json({
          error: "Password is required when password protection is enabled",
        });
      }
    }

    // Validate expiration date
    if (securitySettings.expiresAt) {
      if (isNaN(securitySettings.expiresAt.getTime())) {
        return res.status(400).json({
          error: "Invalid expiration date format",
        });
      }
      if (securitySettings.expiresAt <= new Date()) {
        return res.status(400).json({
          error: "Expiration date must be in the future",
        });
      }
    }

    // Validate max scans
    if (securitySettings.maxScans < 0) {
      return res.status(400).json({
        error: "Maximum scans cannot be negative",
      });
    }

    // Create temporary ID for tracking URL
    const temporaryId = new mongoose.Types.ObjectId();

    // Generate tracking URL if enabled
    let finalTrackingUrl = null;
    let qrTextForImage = text;

    if (enableTracking) {
      const baseUrl =
        process.env.NODE_ENV === "production"
          ? process.env.PRODUCTION_URL ||
            "https://qr-generator-advanced.onrender.com"
          : `${req.protocol}://${req.get("host")}`;

      finalTrackingUrl = createTrackingUrl(baseUrl, temporaryId.toString());
      qrTextForImage = finalTrackingUrl;
    }

    // Handle logo upload
    let logoPath = null;
    if (req.file) {
      logoPath = `/uploads/logos/${req.file.filename}`;
      customization.logo = logoPath;
    }

    // Generate QR code image
    const qrImage = await generateQRCodeWithLogo(qrTextForImage, customization);

    // Create and save QR code

    // Temporarily disable password protection for object creation
    const tempSecuritySettings = { ...securitySettings };
    if (securitySettings.isPasswordProtected) {
      tempSecuritySettings.isPasswordProtected = false;
      tempSecuritySettings.password = "";
    }

    const qrCode = new QRCodeModel({
      _id: temporaryId,
      userId,
      text, // Original text/URL
      qrType,
      qrImage,
      customization,
      security: tempSecuritySettings,
      tags,
      trackingEnabled: enableTracking,
      trackingUrl: finalTrackingUrl,
    });

    // Now set the correct security settings after creation
    if (securitySettings.isPasswordProtected) {
      qrCode.security.isPasswordProtected = true;
      qrCode.security.password = securitySettings.password;
    }

    await qrCode.save();

    res.status(201).json(qrCode);
  } catch (error) {
    console.error("Error creating QR code:", error);
    res.status(500).json({ error: "Error creating QR code" });
  }
});

// Upload logo for QR code
router.post(
  "/upload-logo",
  authMiddleware,
  upload.single("logo"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No logo file uploaded" });
      }

      // Return the path to the uploaded logo
      const logoPath = `/uploads/logos/${req.file.filename}`;
      res.json({ logoPath });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Format content based on QR type
router.post("/format-content", authMiddleware, async (req, res) => {
  try {
    const { qrType, data } = req.body;

    let formattedContent = "";

    switch (qrType) {
      case "vcard":
        formattedContent = qrTypeFormatter.formatVCard(data);
        break;
      case "wifi":
        formattedContent = qrTypeFormatter.formatWifi(data);
        break;
      case "email":
        formattedContent = qrTypeFormatter.formatEmail(data);
        break;
      case "sms":
        formattedContent = qrTypeFormatter.formatSMS(data);
        break;
      case "geo":
        formattedContent = qrTypeFormatter.formatGeo(data);
        break;
      case "event":
        formattedContent = qrTypeFormatter.formatEvent(data);
        break;
      default:
        formattedContent = data.text || "";
    }

    res.json({ formattedContent });
  } catch (error) {
    console.error("Error formatting content:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a QR code
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const updateData = req.body;

    // Prevent updating userId
    delete updateData.userId;

    const qrCode = await QRCodeModel.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true }
    );

    if (!qrCode) {
      return res
        .status(404)
        .json({ error: "QR code not found or unauthorized" });
    }

    res.json(qrCode);
  } catch (error) {
    console.error("Error updating QR code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a QR code
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const qrCode = await QRCodeModel.findOneAndDelete({ _id: id, userId });

    if (!qrCode) {
      return res
        .status(404)
        .json({ error: "QR code not found or unauthorized" });
    }

    res.json({ message: "QR code deleted successfully" });
  } catch (error) {
    console.error("Error deleting QR code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Bulk delete QR codes
router.post("/delete-bulk", authMiddleware, async (req, res) => {
  try {
    const { qrCodeIds } = req.body;
    const userId = req.user.userId;

    if (!Array.isArray(qrCodeIds) || qrCodeIds.length === 0) {
      return res
        .status(400)
        .json({ error: "No QR codes specified for deletion" });
    }

    // Find and delete QR codes that belong to the user
    const result = await QRCodeModel.deleteMany({
      _id: { $in: qrCodeIds },
      userId: userId,
    });

    res.json({
      message: `Successfully deleted ${result.deletedCount} QR codes`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error bulk deleting QR codes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper function to calculate optimal QR version
function calculateOptimalVersion(contentLength, hasLogo) {
  let version = 2;
  while (version <= 40) {
    const effectiveLength = hasLogo
      ? Math.ceil(contentLength * 1.3)
      : contentLength;
    if (version * version * 4 >= effectiveLength) {
      return version;
    }
    version++;
  }
  return 40;
}

// Helper function to generate QR code with logo
async function generateQRCodeWithLogo(qrText, customization) {
  try {
    // console.log(`[generateQRCodeWithLogo] Called with qrText: '${qrText}', customization:`, JSON.stringify(customization)); // Optional: Log inputs

    const qrCodeBuffer = await QRCode.toBuffer(qrText, {
      errorCorrectionLevel: "H",
      margin: customization?.margin || 4,
      color: {
        dark: customization?.color || "#000000",
        light: customization?.backgroundColor || "#FFFFFF",
      },
      width: 1024, // Increased width for better logo clarity
    });

    const qrImage = await Jimp.read(qrCodeBuffer);

    if (
      customization?.logo &&
      typeof customization.logo === "string" &&
      customization.logo.trim() !== ""
    ) {
      // Check if the logo is an SVG file and skip processing
      const isLogoSVG =
        customization.logo.toLowerCase().includes(".svg") ||
        customization.logo.toLowerCase().includes("image/svg");

      if (isLogoSVG) {
        // Continue without adding logo - just generate QR code without logo
      } else {
        let logoImage;
        if (
          customization.logo.startsWith("data:image") &&
          customization.logo.includes(";base64,")
        ) {
          // Handle base64 encoded logo
          const base64Data = customization.logo.split(";base64,").pop();
          const logoBuffer = Buffer.from(base64Data, "base64");
          logoImage = await Jimp.read(logoBuffer);
        } else {
          // Handle logo as a file path (existing logic, as a fallback)
          const logoFilename = path.basename(customization.logo);
          const logoDir = path.resolve(__dirname, "..", "uploads", "logos");
          const logoPath = path.join(logoDir, logoFilename);

          if (!fs.existsSync(logoPath)) {
            console.error(
              `[generateQRCodeWithLogo] Logo file not found at: ${logoPath}. Original logo value: ${customization.logo}`
            );
            throw new Error(`Logo file not found. Attempted path: ${logoPath}`);
          }
          logoImage = await Jimp.read(logoPath);
        }

        const logoSize = qrImage.getWidth() * 0.25; // Logo size 25% of QR width
        logoImage.resize(logoSize, Jimp.AUTO); // Resize maintaining aspect ratio

        const xPos = (qrImage.getWidth() - logoImage.getWidth()) / 2;
        const yPos = (qrImage.getHeight() - logoImage.getHeight()) / 2;

        qrImage.composite(logoImage, xPos, yPos, {
          mode: Jimp.BLEND_SOURCE_OVER,
          opacitySource: 1,
          opacityDest: 1,
        });
      }
    } else if (customization?.logo) {
      // console.log(`[generateQRCodeWithLogo] Invalid or empty logo path/data provided: ${customization.logo}`);
    }

    const mimeType = Jimp.MIME_PNG;
    const base64 = await qrImage.getBase64Async(mimeType);
    return base64;
  } catch (error) {
    console.error(
      "[generateQRCodeWithLogo] Error during processing. QR Text:",
      qrText,
      "Customization:",
      JSON.stringify(customization, null, 2), // Added null, 2 for pretty print
      "Error Message:",
      error.message,
      "Error Stack:",
      error.stack
    );
    throw new Error(
      `Failed during QR code generation with logo: ${error.message}`
    );
  }
}

// Bulk operations - create multiple QR codes
router.post("/bulk", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    // Destructure enableTracking from req.body, defaulting to true
    const { qrCodes, enableTracking = true } = req.body;

    if (!Array.isArray(qrCodes) || qrCodes.length === 0) {
      return res.status(400).json({ error: "No QR codes provided" });
    }

    // Validate all QR codes first before processing
    for (const qr of qrCodes) {
      // Validate password if protection is enabled
      if (
        qr.security?.isPasswordProtected &&
        (!qr.security.password || qr.security.password.trim() === "")
      ) {
        return res.status(400).json({
          error: "Password is required when password protection is enabled",
          qrText: qr.text,
        });
      }

      // Validate expiration date
      if (qr.security?.expiresAt) {
        const expiryDate = new Date(qr.security.expiresAt);
        if (isNaN(expiryDate.getTime())) {
          return res.status(400).json({
            error: "Invalid expiration date format",
            qrText: qr.text,
          });
        }
        if (expiryDate <= new Date()) {
          return res.status(400).json({
            error: "Expiration date must be in the future",
            qrText: qr.text,
          });
        }
      }
    }

    const processedQRCodes = await Promise.all(
      qrCodes.map(async (qr) => {
        try {
          const temporaryId = new mongoose.Types.ObjectId();
          let qrTextForImage = qr.text; // Default to original text for QR image
          let finalTrackingUrl = null;
          if (enableTracking) {
            // Use RENDER_EXTERNAL_URL when in production, fallback to the request's origin
            const baseUrl =
              process.env.NODE_ENV === "production"
                ? "https://qr-generator-advanced.onrender.com"
                : `${req.protocol}://${req.get("host")}`;
            finalTrackingUrl = createTrackingUrl(
              baseUrl,
              temporaryId.toString()
            );
            qrTextForImage = finalTrackingUrl; // If tracking is on, QR image uses the tracking URL
          }

          const finalQrImage = await generateQRCodeWithLogo(
            qrTextForImage,
            qr.customization
          ); // Validate password if protection is enabled to prevent downstream errors
          if (
            qr.security?.isPasswordProtected &&
            (!qr.security.password ||
              typeof qr.security.password !== "string" ||
              qr.security.password.trim() === "")
          ) {
            throw new Error(
              "Password is required when password protection is enabled"
            );
          }

          const qrCode = new QRCodeModel({
            _id: temporaryId,
            userId,
            text: qr.text, // Original text
            qrImage: finalQrImage,
            qrType: qr.qrType || "url",
            security: {
              password:
                qr.security?.isPasswordProtected && qr.security.password
                  ? qr.security.password.trim()
                  : "",
              isPasswordProtected: Boolean(qr.security?.isPasswordProtected),
              expiresAt: qr.security?.expiresAt || null,
              maxScans: parseInt(qr.security?.maxScans) || 0,
            },
            customization: qr.customization,
            tags: qr.tags || [],
            trackingEnabled: enableTracking, // Store tracking status
            trackingUrl: finalTrackingUrl, // Store the tracking URL if enabled
          });

          await qrCode.save();
          return qrCode;
        } catch (error) {
          console.error("Error processing QR code in bulk:", error);
          return {
            error: error.message,
            text: qr.text,
          }; // Return error info instead of null
        }
      })
    );

    // Check for errors in processed QR codes
    const errors = processedQRCodes.filter((qr) => qr && qr.error);
    if (errors.length > 0) {
      return res.status(400).json({
        error: "Some QR codes could not be created",
        details: errors,
      });
    }

    const successfulQRCodes = processedQRCodes.filter(
      (qr) => qr !== null && !qr.error
    );
    res.status(201).json(successfulQRCodes);
  } catch (error) {
    console.error("Error in bulk QR code creation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
