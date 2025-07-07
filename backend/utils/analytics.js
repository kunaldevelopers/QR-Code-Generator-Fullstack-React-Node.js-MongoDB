/**
 * Utility functions for tracking QR code scans and analytics
 */

const mongoose = require("mongoose");
const QRCode = require("../models/QRCode");
const shortid = require("shortid");

// Create a tracking URL for a QR code
const createTrackingUrl = (baseUrl, qrCodeId) => {
  const trackingId = shortid.generate();
  return `${baseUrl}/track/${qrCodeId}/${trackingId}`;
};

// Check if a QR code has expired
const isQrCodeExpired = async (qrCode) => {
  try {
    if (!qrCode) {
      console.log("[isQrCodeExpired] No QR Code provided");
      return true;
    }

    // Get fresh data to avoid race conditions
    const freshQR = await QRCode.findById(qrCode._id);
    if (!freshQR) {
      console.log("[isQrCodeExpired] QR Code not found in fresh check");
      return true;
    }

    // Log detailed expiration check info
    console.log("[isQrCodeExpired] Checking expiration for QR Code:", {
      id: freshQR._id,
      scanCount: freshQR.analytics?.scanCount || 0,
      maxScans: freshQR.security?.maxScans || 0,
      expiryDate: freshQR.security?.expiresAt,
      currentlyMarkedExpired: freshQR.expired,
      scanLimitReached:
        freshQR.security?.maxScans > 0 &&
        (freshQR.analytics?.scanCount || 0) >= freshQR.security?.maxScans,
    });

    // Use the checkExpiration method
    if (freshQR.checkExpiration()) {
      // Determine the reason for expiration
      let expiryReason = "unknown";
      if (freshQR.expired) {
        expiryReason = "manually marked as expired";
      } else if (
        freshQR.security?.maxScans > 0 &&
        (freshQR.analytics?.scanCount || 0) >= freshQR.security?.maxScans
      ) {
        expiryReason = `scan limit reached (${freshQR.analytics.scanCount}/${freshQR.security.maxScans})`;
      } else if (
        freshQR.security?.expiresAt &&
        new Date() > new Date(freshQR.security?.expiresAt)
      ) {
        expiryReason = `date expired (${new Date(
          freshQR.security.expiresAt
        ).toISOString()})`;
      }

      console.log(
        "[isQrCodeExpired] QR Code is expired. Reason:",
        expiryReason
      );

      // Update expired status if not already set
      if (!freshQR.expired) {
        console.log("[isQrCodeExpired] Marking QR Code as expired in database");
        await QRCode.findByIdAndUpdate(freshQR._id, { expired: true });
      }
      return true;
    }

    console.log(
      "[isQrCodeExpired] QR Code is valid. Remaining scans:",
      freshQR.security?.maxScans > 0
        ? freshQR.security.maxScans - (freshQR.analytics?.scanCount || 0)
        : "unlimited"
    );
    return false;
  } catch (error) {
    console.error(
      "[isQrCodeExpired] Error checking QR code expiration:",
      error
    );
    // Default to not expired on error to avoid blocking legitimate scans
    // You could change this to return true if you want to be more conservative
    return false;
  }
};

// Record a scan with proper locking
const recordScan = async (qrCodeId, scanData = {}) => {
  console.log("[recordScan] Starting scan record for:", qrCodeId);

  const session = await QRCode.startSession();
  try {
    session.startTransaction();

    // Get QR code with session to ensure consistency
    const qrCode = await QRCode.findById(qrCodeId).session(session);
    if (!qrCode) {
      console.log("[recordScan] QR code not found");
      await session.abortTransaction();
      return null;
    }

    // Check expiration and limits first
    if (await isQrCodeExpired(qrCode)) {
      console.log("[recordScan] QR code is expired or at limit");
      await session.abortTransaction();
      return null;
    } // Double check scan limit before proceeding
    if (
      qrCode.security.maxScans > 0 &&
      qrCode.analytics.scanCount >= qrCode.security.maxScans
    ) {
      console.log("[recordScan] Scan limit already reached:", {
        currentCount: qrCode.analytics.scanCount,
        maxScans: qrCode.security.maxScans,
        exceeded: qrCode.analytics.scanCount - qrCode.security.maxScans,
      });
      await QRCode.findByIdAndUpdate(qrCodeId, { expired: true }, { session });
      await session.abortTransaction();
      return null;
    }

    // Create scan record
    const scanRecord = {
      userAgent: scanData.userAgent || "",
      ip: scanData.ip || "",
      referer: scanData.referer || "",
      country: scanData.country || "Unknown",
      city: scanData.city || "Unknown",
      timestamp: new Date(),
    }; // Log the current state before update
    console.log("[recordScan] Current QR code state before update:", {
      scanCount: qrCode.analytics?.scanCount || 0,
      maxScans: qrCode.security?.maxScans || 0,
    });

    // Update QR code atomically - fixed query to avoid comparison with field reference
    const updatedQR = await QRCode.findOneAndUpdate(
      {
        _id: qrCodeId,
        expired: false,
      },
      {
        $inc: { "analytics.scanCount": 1 },
        $set: { "analytics.lastScanned": new Date() },
        $push: { "analytics.scans": scanRecord },
      },
      {
        new: true,
        session: session,
      }
    );

    if (!updatedQR) {
      console.log("[recordScan] Failed to update QR code");
      await session.abortTransaction();
      return null;
    } // Check if we need to mark as expired due to scan limit
    if (
      updatedQR.security.maxScans > 0 &&
      updatedQR.analytics.scanCount >= updatedQR.security.maxScans
    ) {
      console.log(
        `[recordScan] Scan limit reached (${updatedQR.analytics.scanCount}/${updatedQR.security.maxScans}). Marking as expired.`
      );

      // Mark the QR code as expired
      const expirationUpdate = await QRCode.findByIdAndUpdate(
        qrCodeId,
        { expired: true },
        {
          new: true, // Return updated document
          session,
        }
      );

      console.log(`[recordScan] QR code marked as expired. New state:`, {
        expired: expirationUpdate.expired,
        scanCount: expirationUpdate.analytics.scanCount,
      });

      // Update our current reference
      updatedQR.expired = true;
    }

    await session.commitTransaction();
    console.log("[recordScan] Successfully recorded scan:", {
      id: updatedQR._id,
      currentCount: updatedQR.analytics.scanCount,
      maxScans: updatedQR.security.maxScans,
      remaining:
        updatedQR.security.maxScans > 0
          ? Math.max(
              0,
              updatedQR.security.maxScans - updatedQR.analytics.scanCount
            )
          : "unlimited",
      nowExpired: updatedQR.expired,
    });
    return updatedQR;
  } catch (error) {
    console.error("[recordScan] Error:", error);
    await session.abortTransaction();
    return null;
  } finally {
    session.endSession();
  }
};

// Get analytics for a QR code or user
const getAnalytics = async (qrCodeId = null, userId = null) => {
  console.log(
    "[getAnalytics] Called with qrCodeId:",
    qrCodeId,
    "userId:",
    userId
  ); // New log
  try {
    let query = {};

    if (qrCodeId) {
      query = { _id: qrCodeId };
    } else if (userId) {
      query = { userId };
    } else {
      return null;
    }

    const qrCodes = await QRCode.find(query);

    // For a single QR code
    if (qrCodeId) {
      return qrCodes[0]?.analytics || null;
    }

    // For all user's QR codes
    const analytics = {
      totalQrCodes: qrCodes.length,
      totalScans: 0,
      scansByDate: {},
      scansByDevice: {},
      scansByLocation: {},
      mostScanned: null,
    };

    let maxScans = 0;

    qrCodes.forEach((qr) => {
      // Count total scans
      analytics.totalScans += qr.analytics.scanCount || 0;

      // Find most scanned QR code
      if ((qr.analytics.scanCount || 0) > maxScans) {
        maxScans = qr.analytics.scanCount;
        analytics.mostScanned = {
          id: qr._id,
          text: qr.text,
          scanCount: qr.analytics.scanCount,
        };
      }

      // Count scans by device
      (qr.analytics.devices || []).forEach((device) => {
        if (!analytics.scansByDevice[device.type]) {
          analytics.scansByDevice[device.type] = 0;
        }
        analytics.scansByDevice[device.type] += device.count;
      });

      // Count scans by location
      (qr.analytics.scanLocations || []).forEach((location) => {
        const key = location.country || "Unknown";
        if (!analytics.scansByLocation[key]) {
          analytics.scansByLocation[key] = 0;
        }
        analytics.scansByLocation[key] += 1;
      });
    });

    return analytics;
  } catch (error) {
    console.error("Error getting analytics:", error);
    return null;
  }
};

module.exports = {
  createTrackingUrl,
  recordScan,
  isQrCodeExpired,
  getAnalytics,
};
