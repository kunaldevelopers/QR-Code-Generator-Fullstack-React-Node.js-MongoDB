const QRPreview = ({ qrData, size = 200, className = "" }) => {
  // If we have actual QR code image data, display it
  if (qrData && qrData.image) {
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
        />
      </div>
    );
  }

  // Fallback placeholder for when no image is available
  const generateQRPattern = () => {
    const patterns = [
      "M20,20 L180,20 L180,180 L20,180 Z M40,40 L160,40 L160,160 L40,160 Z M60,60 L140,60 L140,140 L60,140 Z",
      "M10,10 L190,10 L190,190 L10,190 Z M30,30 L170,30 L170,170 L30,170 Z M50,50 L150,50 L150,150 L50,150 Z",
      "M15,15 L185,15 L185,185 L15,185 Z M35,35 L165,35 L165,165 L35,165 Z M55,55 L145,55 L145,145 L55,145 Z",
    ];

    return patterns[Math.floor(Math.random() * patterns.length)];
  };

  return (
    <div
      className={`bg-white p-4 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      <svg width={size} height={size} className="mx-auto">
        <rect width={size} height={size} fill="white" />
        <path d={generateQRPattern()} fill="black" />
        {/* Corner markers */}
        <rect x="20" y="20" width="40" height="40" fill="black" />
        <rect x="30" y="30" width="20" height="20" fill="white" />
        <rect x={size - 60} y="20" width="40" height="40" fill="black" />
        <rect x={size - 50} y="30" width="20" height="20" fill="white" />
        <rect x="20" y={size - 60} width="40" height="40" fill="black" />
        <rect x="30" y={size - 50} width="20" height="20" fill="white" />
      </svg>
    </div>
  );
};

export default QRPreview;
