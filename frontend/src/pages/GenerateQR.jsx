import { useState } from "react";
import { HiDownload, HiEye } from "react-icons/hi";
import toast from "react-hot-toast";
import Button from "../components/Button";
import Input from "../components/Input";
import QRPreview from "../components/QRPreview";
import apiClient from "../utils/api";

const GenerateQR = () => {
  const [qrType, setQrType] = useState("url");
  const [formData, setFormData] = useState({
    url: "",
    text: "",
    // vCard fields
    name: "",
    phone: "",
    email: "",
    organization: "",
    // WiFi fields
    ssid: "",
    password: "",
    security: "WPA",
    // Email fields
    emailTo: "",
    subject: "",
    body: "",
    // SMS fields
    smsNumber: "",
    smsText: "",
    // Location fields
    latitude: "",
    longitude: "",
    // Calendar fields
    eventTitle: "",
    eventDate: "",
    eventTime: "",
    eventLocation: "",
  });

  const [customization, setCustomization] = useState({
    color: "#000000",
    backgroundColor: "#ffffff",
    margin: 4,
    logoFile: null,
  });

  const [security, setSecurity] = useState({
    isPasswordProtected: false,
    password: "",
    expiresAt: "",
    maxScans: 0,
  });

  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [qrPreview, setQrPreview] = useState(null);
  const [generatedQR, setGeneratedQR] = useState(null);

  const qrTypes = [
    { value: "url", label: "Website URL" },
    { value: "text", label: "Plain Text" },
    { value: "vcard", label: "Contact (vCard)" },
    { value: "wifi", label: "WiFi Network" },
    { value: "email", label: "Email" },
    { value: "sms", label: "SMS" },
    { value: "geo", label: "Location" },
    { value: "event", label: "Calendar Event" },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCustomizationChange = (e) => {
    const { name, value, type } = e.target;
    setCustomization((prev) => ({
      ...prev,
      [name]: type === "number" ? parseInt(value) : value,
    }));
  };

  const handleSecurityChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSecurity((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCustomization((prev) => ({
        ...prev,
        logoFile: file,
      }));
    }
  };

  const generateQRData = () => {
    switch (qrType) {
      case "url":
        return formData.url;
      case "text":
        return formData.text;
      case "vcard":
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${formData.name}\nTEL:${formData.phone}\nEMAIL:${formData.email}\nORG:${formData.organization}\nEND:VCARD`;
      case "wifi":
        return `WIFI:T:${formData.security};S:${formData.ssid};P:${formData.password};H:false;`;
      case "email":
        return `mailto:${formData.emailTo}?subject=${formData.subject}&body=${formData.body}`;
      case "sms":
        return `sms:${formData.smsNumber}?body=${formData.smsText}`;
      case "geo":
        return `geo:${formData.latitude},${formData.longitude}`;
      case "event":
        return `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${formData.eventTitle}\nDTSTART:${formData.eventDate}T${formData.eventTime}\nLOCATION:${formData.eventLocation}\nEND:VEVENT\nEND:VCALENDAR`;
      default:
        return "";
    }
  };

  const handleGenerate = async () => {
    const qrData = generateQRData();
    if (!qrData) {
      toast.error("Please fill in the required fields");
      return;
    }

    setLoading(true);

    try {
      const qrPayload = {
        text: qrData,
        qrType,
        customization,
        security,
        enableTracking: true,
      };

      // Add logo file if present
      if (customization.logoFile) {
        qrPayload.logo = customization.logoFile;
      }

      const result = await apiClient.createQRCode(qrPayload);

      setGeneratedQR(result);
      setGenerated(true);
      setQrPreview({
        data: qrData,
        type: qrType,
        image: result.qrImage,
      });

      toast.success("QR code generated successfully!");
    } catch (error) {
      console.error("QR generation error:", error);
      toast.error(error.message || "Failed to generate QR code");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (format) => {
    if (!generated || !generatedQR) {
      toast.error("Please generate a QR code first");
      return;
    }

    // Create download link
    const link = document.createElement("a");
    link.href = generatedQR.qrImage;
    link.download = `qr-code-${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`QR code downloaded as ${format.toUpperCase()}`);
  };

  const renderFormFields = () => {
    switch (qrType) {
      case "url":
        return (
          <Input
            label="Website URL"
            name="url"
            placeholder="https://example.com"
            value={formData.url}
            onChange={handleInputChange}
          />
        );

      case "text":
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Text Content
            </label>
            <textarea
              name="text"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="Enter your text here..."
              value={formData.text}
              onChange={handleInputChange}
            />
          </div>
        );

      case "vcard":
        return (
          <div className="space-y-4">
            <Input
              label="Full Name"
              name="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleInputChange}
            />
            <Input
              label="Phone Number"
              name="phone"
              placeholder="+1234567890"
              value={formData.phone}
              onChange={handleInputChange}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleInputChange}
            />
            <Input
              label="Organization"
              name="organization"
              placeholder="Company Name"
              value={formData.organization}
              onChange={handleInputChange}
            />
          </div>
        );

      case "wifi":
        return (
          <div className="space-y-4">
            <Input
              label="Network Name (SSID)"
              name="ssid"
              placeholder="MyWiFiNetwork"
              value={formData.ssid}
              onChange={handleInputChange}
            />
            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="WiFi Password"
              value={formData.password}
              onChange={handleInputChange}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Security Type
              </label>
              <select
                name="security"
                value={formData.security}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">No Password</option>
              </select>
            </div>
          </div>
        );

      case "email":
        return (
          <div className="space-y-4">
            <Input
              label="Email Address"
              name="emailTo"
              type="email"
              placeholder="recipient@example.com"
              value={formData.emailTo}
              onChange={handleInputChange}
            />
            <Input
              label="Subject"
              name="subject"
              placeholder="Email subject"
              value={formData.subject}
              onChange={handleInputChange}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message Body
              </label>
              <textarea
                name="body"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Email message..."
                value={formData.body}
                onChange={handleInputChange}
              />
            </div>
          </div>
        );

      case "sms":
        return (
          <div className="space-y-4">
            <Input
              label="Phone Number"
              name="smsNumber"
              placeholder="+1234567890"
              value={formData.smsNumber}
              onChange={handleInputChange}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message
              </label>
              <textarea
                name="smsText"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="SMS message..."
                value={formData.smsText}
                onChange={handleInputChange}
              />
            </div>
          </div>
        );

      case "geo":
        return (
          <div className="space-y-4">
            <Input
              label="Latitude"
              name="latitude"
              type="number"
              step="any"
              placeholder="40.7128"
              value={formData.latitude}
              onChange={handleInputChange}
            />
            <Input
              label="Longitude"
              name="longitude"
              type="number"
              step="any"
              placeholder="-74.0060"
              value={formData.longitude}
              onChange={handleInputChange}
            />
          </div>
        );

      case "event":
        return (
          <div className="space-y-4">
            <Input
              label="Event Title"
              name="eventTitle"
              placeholder="Meeting with John"
              value={formData.eventTitle}
              onChange={handleInputChange}
            />
            <Input
              label="Date"
              name="eventDate"
              type="date"
              value={formData.eventDate}
              onChange={handleInputChange}
            />
            <Input
              label="Time"
              name="eventTime"
              type="time"
              value={formData.eventTime}
              onChange={handleInputChange}
            />
            <Input
              label="Location"
              name="eventLocation"
              placeholder="Conference Room A"
              value={formData.eventLocation}
              onChange={handleInputChange}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Generate QR Code
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create custom QR codes with advanced features
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
          {/* Configuration Panel */}
          <div className="space-y-6">
            {/* QR Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                QR Code Type
              </label>
              <select
                value={qrType}
                onChange={(e) => setQrType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                {qrTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Content Form Fields */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Content
              </h3>
              {renderFormFields()}
            </div>

            {/* Customization Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Customization
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Foreground Color
                  </label>
                  <input
                    type="color"
                    name="color"
                    value={customization.color}
                    onChange={handleCustomizationChange}
                    className="w-full h-10 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Background Color
                  </label>
                  <input
                    type="color"
                    name="backgroundColor"
                    value={customization.backgroundColor}
                    onChange={handleCustomizationChange}
                    className="w-full h-10 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Margin
                </label>
                <input
                  type="range"
                  name="margin"
                  min="0"
                  max="10"
                  value={customization.margin}
                  onChange={handleCustomizationChange}
                  className="w-full"
                />
                <span className="text-sm text-gray-500">
                  {customization.margin}px
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Logo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            {/* Security Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Security & Access
              </h3>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isPasswordProtected"
                  checked={security.isPasswordProtected}
                  onChange={handleSecurityChange}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password Protection
                </label>
              </div>

              {security.isPasswordProtected && (
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Enter password"
                  value={security.password}
                  onChange={handleSecurityChange}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    name="expiresAt"
                    value={security.expiresAt}
                    onChange={handleSecurityChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <Input
                  label="Max Scans (0 = unlimited)"
                  name="maxScans"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={security.maxScans}
                  onChange={handleSecurityChange}
                />
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Generating..." : "Generate QR Code"}
            </Button>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Preview
              </h3>

              {generated && qrPreview ? (
                <div className="space-y-4">
                  <QRPreview qrData={qrPreview} />

                  {/* Download Options */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Download Options
                    </h4>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleDownload("png")}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <HiDownload /> PNG
                      </Button>
                      <Button
                        onClick={() => handleDownload("jpg")}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <HiDownload /> JPG
                      </Button>
                      <Button
                        onClick={() => handleDownload("svg")}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <HiDownload /> SVG
                      </Button>
                    </div>
                  </div>

                  {/* Tracking Link */}
                  {generatedQR?.trackingUrl && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Tracking Link
                      </h4>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Use this link to track scans and analytics:
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={generatedQR.trackingUrl}
                            readOnly
                            className="flex-1 text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                generatedQR.trackingUrl
                              );
                              toast.success(
                                "Tracking link copied to clipboard!"
                              );
                            }}
                            variant="outline"
                            className="text-sm"
                          >
                            Copy
                          </Button>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button
                            onClick={() =>
                              window.open(generatedQR.trackingUrl, "_blank")
                            }
                            variant="outline"
                            className="text-sm"
                          >
                            Open Link
                          </Button>
                          <Button
                            onClick={() => {
                              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                                generatedQR.trackingUrl
                              )}`;
                              const link = document.createElement("a");
                              link.href = qrUrl;
                              link.download = `tracking-qr-${Date.now()}.png`;
                              link.click();
                              toast.success("Tracking QR code downloaded!");
                            }}
                            variant="outline"
                            className="text-sm"
                          >
                            Download QR for Link
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center">
                  <HiEye className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500 dark:text-gray-400">
                    Generate a QR code to see preview
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateQR;
