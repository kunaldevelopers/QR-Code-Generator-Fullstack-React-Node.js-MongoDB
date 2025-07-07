import { useState, useEffect } from "react";
import {
  HiSearch,
  HiDownload,
  HiEye,
  HiTrash,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi";
import { formatDate } from "../utils/helpers";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import QRPreview from "../components/QRPreview";
import toast from "react-hot-toast";
import apiClient from "../utils/api";

const History = () => {
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedQRs, setSelectedQRs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'grid'
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [qrToDelete, setQrToDelete] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [qrToPreview, setQrToPreview] = useState(null);

  const itemsPerPage = 10;

  // Load QR codes from API
  useEffect(() => {
    loadQRCodes();
  }, []);

  const loadQRCodes = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getQRCodes();
      setQrCodes(data);
    } catch (error) {
      console.error("Failed to load QR codes:", error);
      toast.error("Failed to load QR codes");
    } finally {
      setLoading(false);
    }
  };

  // Filter QR codes
  const filteredQRs = qrCodes.filter((qr) => {
    const matchesSearch =
      qr.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      qr.qrType?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || qr.qrType === selectedType;
    return matchesSearch && matchesType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredQRs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedQRs = filteredQRs.slice(startIndex, startIndex + itemsPerPage);

  const qrTypes = ["all", ...new Set(qrCodes.map((qr) => qr.qrType))];

  const handleSelectQR = (qrId) => {
    setSelectedQRs((prev) =>
      prev.includes(qrId) ? prev.filter((id) => id !== qrId) : [...prev, qrId]
    );
  };

  const handleSelectAll = () => {
    if (selectedQRs.length === paginatedQRs.length) {
      setSelectedQRs([]);
    } else {
      setSelectedQRs(paginatedQRs.map((qr) => qr._id));
    }
  };

  const handleDelete = async (qrId) => {
    try {
      await apiClient.deleteQRCode(qrId);
      setQrCodes((prev) => prev.filter((qr) => qr._id !== qrId));
      setSelectedQRs((prev) => prev.filter((id) => id !== qrId));
      toast.success("QR code deleted successfully");
      setDeleteModalOpen(false);
      setQrToDelete(null);
    } catch (error) {
      console.error("Failed to delete QR code:", error);
      toast.error("Failed to delete QR code");
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedQRs.map((id) => apiClient.deleteQRCode(id)));
      setQrCodes((prev) => prev.filter((qr) => !selectedQRs.includes(qr._id)));
      setSelectedQRs([]);
      toast.success(`${selectedQRs.length} QR codes deleted successfully`);
    } catch (error) {
      console.error("Failed to delete QR codes:", error);
      toast.error("Failed to delete some QR codes");
    }
  };

  const handleDownload = (qr, format) => {
    const link = document.createElement("a");
    link.href = qr.qrImage;
    link.download = `qr-${qr._id}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`QR code downloaded as ${format.toUpperCase()}`);
  };

  const handleView = (qr) => {
    // Show QR code preview in modal
    setQrToPreview(qr);
    setPreviewModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                QR Code History
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage and download your generated QR codes
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() =>
                  setViewMode(viewMode === "table" ? "grid" : "table")
                }
                variant="outline"
              >
                {viewMode === "table" ? "Grid View" : "Table View"}
              </Button>

              {selectedQRs.length > 0 && (
                <Button
                  onClick={handleBulkDelete}
                  variant="danger"
                  className="flex items-center gap-2"
                >
                  <HiTrash /> Delete Selected ({selectedQRs.length})
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search QR codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<HiSearch />}
              />
            </div>

            <div className="sm:w-48">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {qrTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === "all"
                      ? "All Types"
                      : type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {filteredQRs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {qrCodes.length === 0
                  ? "No QR codes found. Generate your first QR code!"
                  : "No QR codes match your filters."}
              </p>
            </div>
          ) : viewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3">
                      <input
                        type="checkbox"
                        checked={
                          selectedQRs.length === paginatedQRs.length &&
                          paginatedQRs.length > 0
                        }
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left py-3 font-medium text-gray-900 dark:text-white">
                      Preview
                    </th>
                    <th className="text-left py-3 font-medium text-gray-900 dark:text-white">
                      Content
                    </th>
                    <th className="text-left py-3 font-medium text-gray-900 dark:text-white">
                      Type
                    </th>
                    <th className="text-left py-3 font-medium text-gray-900 dark:text-white">
                      Created
                    </th>
                    <th className="text-left py-3 font-medium text-gray-900 dark:text-white">
                      Scans
                    </th>
                    <th className="text-left py-3 font-medium text-gray-900 dark:text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedQRs.map((qr) => (
                    <tr
                      key={qr._id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="py-4">
                        <input
                          type="checkbox"
                          checked={selectedQRs.includes(qr._id)}
                          onChange={() => handleSelectQR(qr._id)}
                          className="rounded"
                        />
                      </td>
                      <td className="py-4">
                        <img
                          src={qr.qrImage}
                          alt="QR Code"
                          className="w-12 h-12 object-contain"
                        />
                      </td>
                      <td className="py-4">
                        <div className="max-w-xs truncate text-gray-900 dark:text-white">
                          {qr.text}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {qr.qrType}
                        </span>
                      </td>
                      <td className="py-4 text-gray-600 dark:text-gray-400">
                        {formatDate(qr.createdAt)}
                      </td>
                      <td className="py-4 text-gray-600 dark:text-gray-400">
                        {qr.analytics?.scanCount || 0}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(qr)}
                            className="text-blue-600 hover:text-blue-800"
                            title="View"
                          >
                            <HiEye />
                          </button>
                          <button
                            onClick={() => handleDownload(qr, "png")}
                            className="text-green-600 hover:text-green-800"
                            title="Download"
                          >
                            <HiDownload />
                          </button>
                          <button
                            onClick={() => {
                              setQrToDelete(qr._id);
                              setDeleteModalOpen(true);
                            }}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <HiTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedQRs.map((qr) => (
                <div
                  key={qr._id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="checkbox"
                      checked={selectedQRs.includes(qr._id)}
                      onChange={() => handleSelectQR(qr._id)}
                      className="rounded"
                    />
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {qr.qrType}
                    </span>
                  </div>

                  <div className="text-center mb-3">
                    <img
                      src={qr.qrImage}
                      alt="QR Code"
                      className="w-24 h-24 mx-auto object-contain"
                    />
                  </div>

                  <div className="space-y-2">
                    <p
                      className="text-sm text-gray-900 dark:text-white truncate"
                      title={qr.text}
                    >
                      {qr.text}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Created: {formatDate(qr.createdAt)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Scans: {qr.analytics?.scanCount || 0}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 mt-3">
                    <button
                      onClick={() => handleView(qr)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="View"
                    >
                      <HiEye />
                    </button>
                    <button
                      onClick={() => handleDownload(qr, "png")}
                      className="p-1 text-green-600 hover:text-green-800"
                      title="Download"
                    >
                      <HiDownload />
                    </button>
                    <button
                      onClick={() => {
                        setQrToDelete(qr._id);
                        setDeleteModalOpen(true);
                      }}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <HiTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {startIndex + 1} to{" "}
                {Math.min(startIndex + itemsPerPage, filteredQRs.length)} of{" "}
                {filteredQRs.length} results
              </p>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <HiChevronLeft /> Previous
                </Button>

                <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
                  {currentPage} of {totalPages}
                </span>

                <Button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  Next <HiChevronRight />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setQrToDelete(null);
        }}
        title="Delete QR Code"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this QR code? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setDeleteModalOpen(false);
                setQrToDelete(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={() => handleDelete(qrToDelete)} variant="danger">
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setQrToPreview(null);
        }}
        title="QR Code Preview"
        size="lg"
      >
        {qrToPreview && (
          <div className="space-y-4">
            <div className="text-center">
              <QRPreview
                qrData={{
                  image: qrToPreview.qrImage,
                  data: qrToPreview.text,
                  type: qrToPreview.qrType,
                }}
                size={300}
                className="mx-auto"
              />
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Type:
                  </span>
                  <span className="ml-2 capitalize bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                    {qrToPreview.qrType}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Scans:
                  </span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {qrToPreview.analytics?.scanCount || 0}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Created:
                  </span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {formatDate(qrToPreview.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Tracking:
                  </span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {qrToPreview.trackingEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Content:
                </span>
                <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded border text-sm text-gray-900 dark:text-white break-all">
                  {qrToPreview.text}
                </div>
              </div>

              {qrToPreview.trackingUrl && (
                <div className="mt-4">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Tracking Link:
                  </span>
                  <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded border text-sm text-gray-900 dark:text-white break-all">
                    <a
                      href={qrToPreview.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {qrToPreview.trackingUrl}
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-2">
              <Button
                onClick={() => handleDownload(qrToPreview, "png")}
                variant="outline"
                className="flex items-center gap-2"
              >
                <HiDownload /> Download PNG
              </Button>
              <Button
                onClick={() => handleDownload(qrToPreview, "svg")}
                variant="outline"
                className="flex items-center gap-2"
              >
                <HiDownload /> Download SVG
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default History;
