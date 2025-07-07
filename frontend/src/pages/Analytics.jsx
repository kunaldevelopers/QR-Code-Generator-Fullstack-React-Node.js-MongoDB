import { useState, useEffect } from "react";
import { HiChartBar, HiEye, HiCode, HiTrendingUp } from "react-icons/hi";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import apiClient from "../utils/api";
import toast from "react-hot-toast";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Analytics = () => {
  const [timeRange, setTimeRange] = useState("3months");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getDashboardAnalytics();
      setAnalyticsData(data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      toast.error("Failed to load analytics data");
      // Set default data if API fails
      setAnalyticsData({
        totalQRCodes: 0,
        totalScans: 0,
        thisMonthQRCodes: 0,
        thisMonthScans: 0,
        typeDistribution: {},
        topQRCodes: [],
        recentActivity: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = [
    {
      name: "Total QR Codes",
      value: analyticsData?.totalQRCodes || 0,
      icon: HiCode,
      color: "bg-blue-500",
      change: "+12%",
      changeType: "positive",
    },
    {
      name: "Total Scans",
      value: analyticsData?.totalScans || 0,
      icon: HiEye,
      color: "bg-green-500",
      change: "+23%",
      changeType: "positive",
    },
    {
      name: "This Month QRs",
      value: analyticsData?.thisMonthQRCodes || 0,
      icon: HiChartBar,
      color: "bg-purple-500",
      change: "+15%",
      changeType: "positive",
    },
    {
      name: "This Month Scans",
      value: analyticsData?.thisMonthScans || 0,
      icon: HiTrendingUp,
      color: "bg-orange-500",
      change: "+8%",
      changeType: "positive",
    },
  ];

  // Create chart data from analytics
  const scansChartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Scans",
        data: [0, 0, 0, 0, 0, analyticsData?.thisMonthScans || 0],
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2,
      },
    ],
  };

  const qrTypesChartData = {
    labels: Object.keys(analyticsData?.typeDistribution || {}),
    datasets: [
      {
        data: Object.values(analyticsData?.typeDistribution || {}),
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(249, 115, 22, 0.8)",
          "rgba(139, 92, 246, 0.8)",
          "rgba(236, 72, 153, 0.8)",
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Analytics Overview",
      },
    },
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Analytics
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Track your QR code performance and usage
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="1month">Last Month</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
          </select>
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
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.name}
                </p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value.toLocaleString()}
                  </p>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      stat.changeType === "positive"
                        ? "text-green-600"
                        : stat.changeType === "negative"
                        ? "text-red-600"
                        : "text-gray-500"
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scans Over Time */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Scans Over Time
          </h2>
          <div className="h-80">
            <Bar data={scansChartData} options={chartOptions} />
          </div>
        </div>

        {/* QR Types Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            QR Code Types
          </h2>
          <div className="h-80">
            {Object.keys(analyticsData?.typeDistribution || {}).length > 0 ? (
              <Pie data={qrTypesChartData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No QR codes created yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Performing QR Codes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Top Performing QR Codes
          </h2>
        </div>
        <div className="p-6">
          {analyticsData?.topQRCodes?.length > 0 ? (
            <div className="space-y-4">
              {analyticsData.topQRCodes.map((qr, index) => (
                <div
                  key={qr.id || index}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white truncate max-w-xs">
                        {qr.text}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {qr.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {qr.scans || 0}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        scans
                      </p>
                    </div>
                    <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${
                            analyticsData.topQRCodes.length > 0
                              ? (qr.scans /
                                  Math.max(
                                    ...analyticsData.topQRCodes.map(
                                      (q) => q.scans
                                    ),
                                    1
                                  )) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No QR codes with scans yet. Create some QR codes to see
                analytics!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
