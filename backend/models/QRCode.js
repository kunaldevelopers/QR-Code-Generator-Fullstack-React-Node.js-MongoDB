const mongoose = require("mongoose");

const qrCodeSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  qrImage: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  qrType: {
    type: String,
    enum: [
      "url",
      "text",
      "vcard",
      "wifi",
      "email",
      "sms",
      "geo",
      "event",
      "phone",
    ],
    default: "url",
  },
  customization: {
    color: { type: String, default: "#000000" },
    backgroundColor: { type: String, default: "#ffffff" },
    logo: { type: String, default: null },
    margin: { type: Number, default: 4 },
  },
  analytics: {
    scanCount: { type: Number, default: 0 },
    lastScanned: { type: Date },
    scans: [
      {
        userAgent: String,
        ip: String,
        referer: String,
        country: String,
        city: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    devices: [
      {
        type: String,
        count: Number,
      },
    ],
  },
  security: {
    password: {
      type: String,
      // Removed setter to avoid interference
    },
    isPasswordProtected: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      set: function (val) {
        if (!val) return null;
        const date = new Date(val);
        return isNaN(date.getTime()) ? null : date;
      },
      get: function (val) {
        return val ? val.toISOString() : null;
      },
    },
    maxScans: {
      type: Number,
      min: 0,
      default: 0,
      set: function (val) {
        return Math.max(0, Math.floor(Number(val) || 0));
      },
    },
  },
  expired: {
    type: Boolean,
    default: false,
  },
  trackingEnabled: {
    type: Boolean,
    default: true,
  },
  trackingUrl: {
    type: String,
    default: null,
  },
});

// Pre-save middleware to validate security settings
qrCodeSchema.pre("save", function (next) {
  const now = new Date();

  // Ensure security object exists
  if (!this.security) {
    this.security = {};
  }

  // Normalize isPasswordProtected to be a proper boolean
  this.security.isPasswordProtected = Boolean(
    this.security.isPasswordProtected
  );

  console.log(
    "[QRCode Model] Pre-save validation - security object:",
    JSON.stringify(this.security, null, 2)
  );

  // Clear password if protection is disabled
  if (!this.security.isPasswordProtected) {
    console.log(
      "[QRCode Model] Password protection disabled, clearing password"
    );
    this.security.password = "";
  }

  // Skip password validation here - handle it in the route instead
  console.log("[QRCode Model] Skipping password validation (handled in route)");

  // Validate and normalize expiration date
  if (this.security.expiresAt) {
    const expiry = new Date(this.security.expiresAt);
    if (isNaN(expiry.getTime())) {
      this.security.expiresAt = null;
    } else {
      // Store dates in UTC to avoid timezone issues
      this.security.expiresAt = new Date(
        Date.UTC(
          expiry.getUTCFullYear(),
          expiry.getUTCMonth(),
          expiry.getUTCDate(),
          expiry.getUTCHours(),
          expiry.getUTCMinutes(),
          expiry.getUTCSeconds()
        )
      );

      if (this.security.expiresAt <= now) {
        this.expired = true;
      }
    }
  }

  // Ensure maxScans is valid
  this.security.maxScans = Math.max(
    0,
    Math.floor(Number(this.security.maxScans) || 0)
  );

  // Check if already expired due to scan limit
  if (
    this.security.maxScans > 0 &&
    this.analytics.scanCount >= this.security.maxScans
  ) {
    this.expired = true;
  }

  next();
});

// Method to check expiration status
qrCodeSchema.methods.checkExpiration = function () {
  try {
    const now = new Date();
    console.log(
      "[checkExpiration] Checking expiration for QR code ID:",
      this._id
    );

    // Check if explicitly marked as expired
    if (this.expired) {
      console.log("[checkExpiration] QR code is marked as expired");
      return true;
    }

    // Check expiration date
    if (this.security?.expiresAt) {
      const expiryDate = new Date(this.security.expiresAt);
      if (!isNaN(expiryDate.getTime())) {
        console.log("[checkExpiration] Comparing dates:", {
          now: now.toISOString(),
          expiryDate: expiryDate.toISOString(),
          expired: now > expiryDate,
        });
        if (now > expiryDate) {
          console.log("[checkExpiration] QR code has expired by date");
          return true;
        }
      } else {
        console.log(
          "[checkExpiration] Invalid expiration date format",
          this.security.expiresAt
        );
      }
    }

    // Check scan limit
    if (this.security?.maxScans > 0) {
      const currentScans = this.analytics?.scanCount || 0;
      console.log("[checkExpiration] Checking scan limits:", {
        currentScans,
        maxScans: this.security.maxScans,
        limitReached: currentScans >= this.security.maxScans,
      });
      if (currentScans >= this.security.maxScans) {
        console.log("[checkExpiration] QR code has reached scan limit");
        return true;
      }
    }

    console.log("[checkExpiration] QR code is valid");
    return false;
  } catch (error) {
    console.error("[checkExpiration] Error checking expiration:", error);
    // Default to not expired on error
    return false;
  }
};

module.exports = mongoose.model("QRCode", qrCodeSchema);
