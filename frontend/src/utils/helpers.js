import { format } from "date-fns";

export const formatDate = (dateString) => {
  return format(new Date(dateString), "MMM dd, yyyy");
};

export const formatDateTime = (dateString) => {
  return format(new Date(dateString), "MMM dd, yyyy HH:mm");
};

export const generateQRPreview = (type) => {
  // This generates a placeholder QR code preview
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#fff"/>
      <rect x="20" y="20" width="160" height="160" fill="#000"/>
      <rect x="40" y="40" width="120" height="120" fill="#fff"/>
      <rect x="60" y="60" width="80" height="80" fill="#000"/>
      <text x="100" y="110" text-anchor="middle" fill="#fff" font-size="12">${type}</text>
    </svg>
  `)}`;
};

export const downloadQR = (format, data) => {
  // Download functionality
  const blob = new Blob([data], { type: "image/png" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `qr-code.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const parseCSV = (csvText) => {
  const lines = csvText.split("\n");
  const headers = lines[0].split(",");
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(",");
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || "";
      });
      data.push(row);
    }
  }

  return data;
};
