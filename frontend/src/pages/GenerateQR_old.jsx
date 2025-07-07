import React, { useState } from 'react';
import { HiDownload, HiEye, HiColorSwatch } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Button from '../components/Button';
import Input from '../components/Input';
import QRPreview from '../components/QRPreview';
import { generateQRPreview } from '../utils/helpers';
import apiClient from '../utils/api';

const GenerateQR = () => {
  const [qrType, setQrType] = useState('url');
  const [formData, setFormData] = useState({
    url: '',
    text: '',
    // vCard fields
    name: '',
    phone: '',
    email: '',
    organization: '',
    // WiFi fields
    ssid: '',
    password: '',
    security: 'WPA',
    // Email fields
    emailTo: '',
    subject: '',
    body: '',
    // SMS fields
    smsNumber: '',
    smsText: '',
    // Location fields
    latitude: '',
    longitude: '',
    // Calendar fields
    eventTitle: '',
    eventDate: '',
    eventTime: '',
    eventLocation: ''
  });
  
  const [customization, setCustomization] = useState({
    color: '#000000',
    backgroundColor: '#ffffff',
    margin: 4,
    logoFile: null
  });
  
  const [security, setSecurity] = useState({
    isPasswordProtected: false,
    password: '',
    expiresAt: '',
    maxScans: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [qrPreview, setQrPreview] = useState(null);
  const [generatedQR, setGeneratedQR] = useState(null);
  
  const qrTypes = [
    { value: 'url', label: 'Website URL' },
    { value: 'text', label: 'Plain Text' },
    { value: 'vcard', label: 'Contact (vCard)' },
    { value: 'wifi', label: 'WiFi Network' },
    { value: 'email', label: 'Email' },
    { value: 'sms', label: 'SMS' },
    { value: 'geo', label: 'Location' },
    { value: 'event', label: 'Calendar Event' }
  ];
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleCustomizationChange = (e) => {
    const { name, value, type } = e.target;
    setCustomization(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value
    }));
  };
  
  const handleSecurityChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSecurity(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCustomization(prev => ({
        ...prev,
        logoFile: file
      }));
    }
  };
  
  const generateQRData = () => {
    switch (qrType) {
      case 'url':
        return formData.url;
      case 'text':
        return formData.text;
      case 'vcard':
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${formData.name}\nTEL:${formData.phone}\nEMAIL:${formData.email}\nORG:${formData.organization}\nEND:VCARD`;
      case 'wifi':
        return `WIFI:T:${formData.security};S:${formData.ssid};P:${formData.password};H:false;`;
      case 'email':
        return `mailto:${formData.emailTo}?subject=${formData.subject}&body=${formData.body}`;
      case 'sms':
        return `sms:${formData.smsNumber}?body=${formData.smsText}`;
      case 'geo':
        return `geo:${formData.latitude},${formData.longitude}`;
      case 'event':
        return `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${formData.eventTitle}\nDTSTART:${formData.eventDate}T${formData.eventTime}\nLOCATION:${formData.eventLocation}\nEND:VEVENT\nEND:VCALENDAR`;
      default:
        return '';
    }
  };
  
  const handleGenerate = async () => {
    const qrData = generateQRData();
    if (!qrData) {
      toast.error('Please fill in the required fields');
      return;
    }
    
    setLoading(true);
    
    try {
      const qrPayload = {
        text: qrData,
        qrType,
        customization,
        security,
        enableTracking: true
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
        image: result.qrImage
      });
      
      toast.success('QR code generated successfully!');
    } catch (error) {
      console.error('QR generation error:', error);
      toast.error(error.message || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownload = (format) => {
    if (!generated || !generatedQR) {
      toast.error('Please generate a QR code first');
      return;
    }
    
    // Create download link
    const link = document.createElement('a');
    link.href = generatedQR.qrImage;
    link.download = `qr-code-${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`QR code downloaded as ${format.toUpperCase()}`);
  };
  
  const renderFormFields = () => {
    switch (qrType) {
      case 'URL':
        return (
          <Input
            label="Website URL"
            name="url"
            placeholder="https://example.com"
            value={formData.url}
            onChange={handleInputChange}
          />
        );
      
  const renderFormFields = () => {
    switch (qrType) {
      case 'url':
        return (
          <Input
            label="Website URL"
            name="url"
            placeholder="https://example.com"
            value={formData.url}
            onChange={handleInputChange}
          />
        );
      
      case 'text':
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
      
      case 'vcard':
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
      
      case 'wifi':
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
      
      case 'email':
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
      
      case 'sms':
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
      
      case 'geo':
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
      
      case 'event':
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
              name="subject"
              placeholder="Email Subject"
              value={formData.subject}
              onChange={handleInputChange}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message Body
              </label>
              <textarea
                name="body"
                rows={3}
                className="input-field"
                placeholder="Enter your message..."
                value={formData.body}
                onChange={handleInputChange}
              />
            </div>
          </div>
        );
      
      case 'SMS':
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
                className="input-field"
                placeholder="Enter your SMS message..."
                value={formData.smsText}
                onChange={handleInputChange}
              />
            </div>
          </div>
        );
      
      case 'Location':
        return (
          <div className="space-y-4">
            <Input
              label="Latitude"
              name="latitude"
              type="number"
              step="any"
              placeholder="37.7749"
              value={formData.latitude}
              onChange={handleInputChange}
            />
            <Input
              label="Longitude"
              name="longitude"
              type="number"
              step="any"
              placeholder="-122.4194"
              value={formData.longitude}
              onChange={handleInputChange}
            />
          </div>
        );
      
      case 'Calendar':
        return (
          <div className="space-y-4">
            <Input
              label="Event Title"
              name="eventTitle"
              placeholder="Meeting Title"
              value={formData.eventTitle}
              onChange={handleInputChange}
            />
            <Input
              label="Event Date"
              name="eventDate"
              type="date"
              value={formData.eventDate}
              onChange={handleInputChange}
            />
            <Input
              label="Event Time"
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
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Generate QR Code
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Create a customized QR code for your content
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="space-y-6">
          {/* Step 1: QR Type Selection */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              1. Select QR Code Type
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {qrTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setQrType(type.value)}
                  className={`p-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                    qrType === type.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Step 2: Content Input */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              2. Enter Content
            </h2>
            {renderFormFields()}
          </div>
          
          {/* Step 3: Customization */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              3. Customize Appearance
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Foreground Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      name="foregroundColor"
                      value={customization.foregroundColor}
                      onChange={handleCustomizationChange}
                      className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600"
                    />
                    <input
                      type="text"
                      name="foregroundColor"
                      value={customization.foregroundColor}
                      onChange={handleCustomizationChange}
                      className="input-field text-sm"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Background Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      name="backgroundColor"
                      value={customization.backgroundColor}
                      onChange={handleCustomizationChange}
                      className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600"
                    />
                    <input
                      type="text"
                      name="backgroundColor"
                      value={customization.backgroundColor}
                      onChange={handleCustomizationChange}
                      className="input-field text-sm"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Size: {customization.size}px
                </label>
                <input
                  type="range"
                  name="size"
                  min="200"
                  max="800"
                  value={customization.size}
                  onChange={handleCustomizationChange}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Margin: {customization.margin}px
                </label>
                <input
                  type="range"
                  name="margin"
                  min="0"
                  max="50"
                  value={customization.margin}
                  onChange={handleCustomizationChange}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Logo Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="input-field"
                />
              </div>
            </div>
          </div>
          
          {/* Step 4: Security Options */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              4. Security Options (Optional)
            </h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="passwordProtected"
                  checked={security.passwordProtected}
                  onChange={handleSecurityChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Password Protected
                </label>
              </div>
              
              {security.passwordProtected && (
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Enter password"
                  value={security.password}
                  onChange={handleSecurityChange}
                />
              )}
              
              <Input
                label="Expiry Date (Optional)"
                name="expiryDate"
                type="date"
                value={security.expiryDate}
                onChange={handleSecurityChange}
              />
              
              <Input
                label="Scan Limit (Optional)"
                name="scanLimit"
                type="number"
                placeholder="Maximum number of scans"
                value={security.scanLimit}
                onChange={handleSecurityChange}
              />
            </div>
          </div>
        </div>
        
        {/* Preview Section */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Preview
            </h2>
            <div className="text-center">
              {generated && qrPreview ? (
                <div className="space-y-4">
                  <QRPreview
                    data={generateQRData()}
                    size={customization.size}
                    className="mx-auto"
                  />
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleDownload('png')}
                    >
                      <HiDownload className="w-4 h-4 mr-1" />
                      PNG
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload('svg')}
                    >
                      <HiDownload className="w-4 h-4 mr-1" />
                      SVG
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload('pdf')}
                    >
                      <HiDownload className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-gray-500 dark:text-gray-400">
                  <HiEye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>QR code preview will appear here</p>
                </div>
              )}
            </div>
          </div>
          
          <Button
            onClick={handleGenerate}
            className="w-full"
            size="lg"
          >
            Generate QR Code
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GenerateQR;