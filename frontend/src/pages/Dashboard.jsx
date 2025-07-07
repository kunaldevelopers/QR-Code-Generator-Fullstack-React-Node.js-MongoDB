import { useState, useEffect } from "react";
import { HiCode, HiClock, HiChartBar, HiEye } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../utils/helpers";
import Button from "../components/Button";
import apiClient from "../utils/api";
import toast from "react-hot-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const [qrCodes, setQrCodes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load QR codes and analytics
      const [qrCodesData, analyticsData] = await Promise.allSettled([
        apiClient.getQRCodes(),
        apiClient.getDashboardAnalytics(),
      ]);

      if (qrCodesData.status === "fulfilled") {
        setQrCodes(qrCodesData.value);
      } else {
        console.error("Failed to load QR codes:", qrCodesData.reason);
      }

      if (analyticsData.status === "fulfilled") {
        setAnalytics(analyticsData.value);
      } else {
        // Provide fallback data if analytics endpoint fails
        console.warn("Analytics endpoint not available, using calculated data");
        setAnalytics(calculateAnalytics(qrCodesData.value || []));
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (qrCodes) => {
    const totalScans = qrCodes.reduce(
      (sum, qr) => sum + (qr.analytics?.scanCount || 0),
      0
    );
    const thisMonth = new Date();
    const thisMonthQRs = qrCodes.filter((qr) => {
      const created = new Date(qr.createdAt);
      return (
        created.getMonth() === thisMonth.getMonth() &&
        created.getFullYear() === thisMonth.getFullYear()
      );
    });

    return {
      totalQRCodes: qrCodes.length,
      totalScans,
      thisMonthQRCodes: thisMonthQRs.length,
      thisMonthScans: thisMonthQRs.reduce(
        (sum, qr) => sum + (qr.analytics?.scanCount || 0),
        0
      ),
      recentActivity: qrCodes.slice(0, 5),
    };
  };

  const stats = [
    {
      name: "Total QR Codes",
      value: analytics?.totalQRCodes || qrCodes.length,
      icon: HiCode,
      color: "bg-blue-500",
    },
    {
      name: "Total Scans",
      value:
        analytics?.totalScans ||
        qrCodes.reduce((sum, qr) => sum + (qr.analytics?.scanCount || 0), 0),
      icon: HiEye,
      color: "bg-green-500",
    },
    {
      name: "This Month",
      value: analytics?.thisMonthQRCodes || 0,
      icon: HiChartBar,
      color: "bg-purple-500",
    },
    {
      name: "Recent Activity",
      value: qrCodes.slice(0, 5).length,
      icon: HiClock,
      color: "bg-orange-500",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Welcome back! Here's what's happening with your QR codes.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={() => navigate("/generate")}>
            Create New QR Code
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
          >
            <div className="flex items-center">
              <div className={`flex-shrink-0 ${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.name}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent QR Codes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Recent QR Codes
              </h2>
              <Button variant="outline" onClick={() => navigate("/history")}>
                View All
              </Button>
            </div>
          </div>
          <div className="p-6">
            {qrCodes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  No QR codes yet. Create your first one!
                </p>
                <Button onClick={() => navigate("/generate")} className="mt-4">
                  Generate QR Code
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {qrCodes.slice(0, 5).map((qr) => (
                  <div
                    key={qr._id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={qr.qrImage}
                        alt="QR Code"
                        className="w-12 h-12 object-contain"
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white truncate max-w-xs">
                          {qr.text}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {qr.qrType} • {formatDate(qr.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {qr.analytics?.scanCount || 0} scans
                      </p>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          qr.analytics?.scanCount > 0
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {qr.analytics?.scanCount > 0 ? "Active" : "Unused"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Quick Actions
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div
                onClick={() => navigate("/generate")}
                className="cursor-pointer p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
              >
                <div className="text-center">
                  <HiCode className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Generate New QR Code
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Create URL, text, vCard, WiFi, and more
                  </p>
                </div>
              </div>

              <div
                onClick={() => navigate("/bulk")}
                className="cursor-pointer p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 transition-colors"
              >
                <div className="text-center">
                  <HiChartBar className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Bulk Generate
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Create multiple QR codes at once
                  </p>
                </div>
              </div>

              <div
                onClick={() => navigate("/analytics")}
                className="cursor-pointer p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 dark:hover:border-green-400 transition-colors"
              >
                <div className="text-center">
                  <HiEye className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    View Analytics
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Track scans and performance
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Types Overview */}
      {qrCodes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              QR Code Types
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(
                qrCodes.reduce((acc, qr) => {
                  acc[qr.qrType] = (acc[qr.qrType] || 0) + 1;
                  return acc;
                }, {})
              ).map(([type, count]) => (
                <div
                  key={type}
                  className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {count}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {type}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
