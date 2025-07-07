import { useState } from "react";

const QRPreview = ({ qrData, size = 200, className = "" }) => {
  const [imageError, setImageError] = useState(false);

  // If we have actual QR code image data, display it
  if (qrData && qrData.image && !imageError) {
    return (
      <div
        className={`bg-white p-4 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
      >
        <img
          src={qrData.image}
          alt="Generated QR Code"
          width={size}
          height={size}
          className="mx-auto object-contain"
          onError={(e) => {
            console.error("Image failed to load:", e.target.src);
            setImageError(true);
          }}
          onLoad={() => setImageError(false)}
        />
      </div>
    );
  }

  // Always show a placeholder to debug
  return (
    <div
      className={`bg-white p-4 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      <div
        className="mx-auto bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400"
        style={{ width: size, height: size }}
      >
        {imageError ? "Image Load Error" : "QR Code Preview"}
      </div>
    </div>
  );
};

export default QRPreview;
