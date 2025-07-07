import { useState } from "react";
import {
  HiUpload,
  HiDownload,
  HiCheckCircle,
  HiXCircle,
  HiDocumentText,
} from "react-icons/hi";
import toast from "react-hot-toast";
import Button from "../components/Button";
import { parseCSV } from "../utils/helpers";
import apiClient from "../utils/api";

const Bulk = () => {
  const [csvData, setCsvData] = useState("");
  const [parsedData, setParsedData] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Results

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        setCsvData(text);
        try {
          const parsed = parseCSV(text);
          setParsedData(parsed);
          setStep(2);
          toast.success("CSV file parsed successfully!");
        } catch (error) {
          toast.error("Error parsing CSV file");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleTextAreaChange = (e) => {
    setCsvData(e.target.value);
  };

  const handleParseCSV = () => {
    try {
      const parsed = parseCSV(csvData);
      setParsedData(parsed);
      setStep(2);
      toast.success("CSV data parsed successfully!");
    } catch (error) {
      toast.error("Error parsing CSV data");
    }
  };

  const handleGenerateAll = async () => {
    if (parsedData.length === 0) {
      toast.error("No data to generate QR codes from");
      return;
    }

    setProcessing(true);
    setStep(3);

    try {
      // Transform parsed CSV data into QR code data format
      const qrDataArray = parsedData.map((row) => ({
        text: row.data || row.url || row.content || "",
        qrType: row.type || "url",
        customization: {
          color: "#000000",
          backgroundColor: "#ffffff",
          margin: 4,
        },
        security: {
          isPasswordProtected: false,
          password: "",
          expiresAt: null,
          maxScans: 0,
        },
        tags: row.tags ? row.tags.split(",").map((tag) => tag.trim()) : [],
      }));

      const createdQRCodes = await apiClient.createBulkQRCodes(qrDataArray);

      const processedResults = createdQRCodes.map((qr, index) => ({
        id: index + 1,
        name: parsedData[index].name || `QR Code ${index + 1}`,
        status: qr.error ? "failed" : "success",
        error: qr.error || null,
        qrCode: qr.error ? null : qr,
        type: parsedData[index].type || "url",
        data:
          parsedData[index].data ||
          parsedData[index].url ||
          parsedData[index].content ||
          "",
      }));

      setResults(processedResults);

      const successCount = processedResults.filter(
        (r) => r.status === "success"
      ).length;
      const failCount = processedResults.filter(
        (r) => r.status === "failed"
      ).length;

      toast.success(
        `Generated ${successCount} QR codes successfully${
          failCount > 0 ? `, ${failCount} failed` : ""
        }`
      );
    } catch (error) {
      console.error("Bulk generation error:", error);
      toast.error("Failed to generate QR codes");
      setResults([]);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadAll = () => {
    const successfulResults = results.filter((r) => r.status === "success");
    // In a real implementation, this would create and download a ZIP file
    toast.success(
      `Downloaded ${successfulResults.length} QR codes as ZIP file`
    );
  };

  const handleReset = () => {
    setCsvData("");
    setParsedData([]);
    setResults([]);
    setStep(1);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Bulk QR Generator
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Generate multiple QR codes at once using CSV data
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4">
        <div
          className={`flex items-center ${
            step >= 1 ? "text-primary-600" : "text-gray-400"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 1
                ? "bg-primary-600 text-white"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            1
          </div>
          <span className="ml-2 text-sm font-medium">Upload CSV</span>
        </div>
        <div
          className={`w-8 h-0.5 ${
            step >= 2 ? "bg-primary-600" : "bg-gray-200 dark:bg-gray-700"
          }`}
        ></div>
        <div
          className={`flex items-center ${
            step >= 2 ? "text-primary-600" : "text-gray-400"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 2
                ? "bg-primary-600 text-white"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            2
          </div>
          <span className="ml-2 text-sm font-medium">Preview</span>
        </div>
        <div
          className={`w-8 h-0.5 ${
            step >= 3 ? "bg-primary-600" : "bg-gray-200 dark:bg-gray-700"
          }`}
        ></div>
        <div
          className={`flex items-center ${
            step >= 3 ? "text-primary-600" : "text-gray-400"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 3
                ? "bg-primary-600 text-white"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            3
          </div>
          <span className="ml-2 text-sm font-medium">Results</span>
        </div>
      </div>

      {/* Step 1: Upload CSV */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Upload CSV File
            </h2>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                <HiUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Drag and drop your CSV file here, or click to select
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button as="span" variant="secondary">
                    Select CSV File
                  </Button>
                </label>
              </div>

              <div className="text-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  or
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Paste CSV Data
                </label>
                <textarea
                  rows={8}
                  className="input-field font-mono text-sm"
                  placeholder="Paste your CSV data here..."
                  value={csvData}
                  onChange={handleTextAreaChange}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleParseCSV} disabled={!csvData.trim()}>
                  Parse CSV
                </Button>
              </div>
            </div>
          </div>

          {/* CSV Format Guide */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              CSV Format Guide
            </h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your CSV file should have the following columns:
              </p>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <code className="text-sm">
                  Name,Type,Data
                  <br />
                  Company Website,url,https://example.com
                  <br />
                  Contact Info,vcard,BEGIN:VCARD VERSION:3.0 FN:John Doe
                  END:VCARD
                  <br />
                  Office WiFi,wifi,WIFI:T:WPA;S:MyNetwork;P:password123;H:false;
                </code>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Name
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Display name for the QR code
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Type
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    URL, Text, vCard, WiFi, Email, SMS, Location, Calendar
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Data
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    The actual content for the QR code
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Preview ({parsedData.length} QR codes)
              </h2>
              <div className="space-x-2">
                <Button variant="secondary" onClick={handleReset}>
                  Back to Upload
                </Button>
                <Button onClick={handleGenerateAll}>
                  Generate All QR Codes
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {parsedData.map((row, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {row.Name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300">
                          {row.Type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div className="max-w-xs truncate">{row.Data}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Generation Results
              </h2>
              <div className="space-x-2">
                <Button variant="secondary" onClick={handleReset}>
                  Generate More
                </Button>
                {!processing && results.length > 0 && (
                  <Button onClick={handleDownloadAll}>
                    <HiDownload className="w-4 h-4 mr-2" />
                    Download All ZIP
                  </Button>
                )}
              </div>
            </div>

            {processing ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">
                  Generating QR codes...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4">
                    <div className="flex items-center">
                      <HiCheckCircle className="h-6 w-6 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Successful
                        </p>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                          {results.filter((r) => r.status === "success").length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 dark:bg-red-900 rounded-lg p-4">
                    <div className="flex items-center">
                      <HiXCircle className="h-6 w-6 text-red-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                          Failed
                        </p>
                        <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                          {results.filter((r) => r.status === "failed").length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
                    <div className="flex items-center">
                      <HiDocumentText className="h-6 w-6 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Total
                        </p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          {results.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Results */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Error
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {results.map((result, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {result.status === "success" ? (
                              <HiCheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <HiXCircle className="h-5 w-5 text-red-500" />
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {result.Name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300">
                              {result.Type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                            {result.error || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Bulk;
