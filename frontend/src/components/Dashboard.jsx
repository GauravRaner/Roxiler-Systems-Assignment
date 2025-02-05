import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer as RechartsResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [transactions, setTransactions] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState({
    totalSaleAmount: 0,
    totalSoldItems: 0,
    totalNotSoldItems: 0
  });
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Custom colors for charts
  const CHART_COLORS = {
    bar: '#4F46E5',
    barHover: '#6366F1',
    pie: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
  };

  // Custom tooltip for bar chart with dark theme
  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800/90 backdrop-blur-sm px-4 py-3 rounded-lg border border-gray-700/50 shadow-xl">
          <p className="text-gray-300 font-medium">{`Price Range: ${payload[0].payload.range}`}</p>
          <p className="text-cyan-400 font-semibold">{`Items: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for pie chart
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800/90 backdrop-blur-sm px-4 py-3 rounded-lg border border-gray-700/50 shadow-xl">
          <p className="text-gray-300 font-medium">{`Category: ${payload[0].name}`}</p>
          <p className="text-cyan-400 font-semibold">{`Items: ${payload[0].value}`}</p>
          <p className="text-gray-400 text-sm">{`(${(payload[0].percent * 100).toFixed(1)}%)`}</p>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, currentPage, search]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [transactionsRes, combinedStats] = await Promise.all([
        api.getTransactions(currentPage, 10, search),
        selectedMonth ? api.getCombinedStats(months.indexOf(selectedMonth) + 1) : null
      ]);

      setTransactions(transactionsRes.data);
      setTotalPages(transactionsRes.pagination.totalPages);

      if (combinedStats) {
        setStats(combinedStats.saleStats);
        setChartData(combinedStats.priceRangeChart);
        setPieData(combinedStats.categoryPieChart);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      {/* Header Section */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Sales Dashboard
        </h1>
        <p className="text-gray-400 mt-2">Interactive Transaction Analytics</p>
      </div>

      {/* Controls Section */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <input
          type="text"
          placeholder="🔍 Search transactions..."
          className="flex-1 p-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          value={search}
          onChange={handleSearchChange}
        />
        <select
          value={selectedMonth}
          onChange={handleMonthChange}
          className="p-3 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          <option value="">📅 All Months</option>
          {months.map((month, index) => (
            <option value={month} key={index}>
              {month}
            </option>
          ))}
        </select>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Transactions Table */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-2xl">
          <h2 className="text-2xl font-semibold text-cyan-400 mb-6">Transaction History</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  {['ID', 'Transaction', 'Price', 'Category', 'Date'].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-gray-400">
                      ⏳ Loading transactions...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-red-400">
                      ❗ {error}
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-gray-400">
                      📭 No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-700 transition-colors duration-200"
                    >
                      <td className="px-4 py-3 text-gray-300 font-mono">{transaction.id}</td>
                      <td className="px-4 py-3 text-white">{transaction.title}</td>
                      <td className="px-4 py-3 text-green-400">
                        ${transaction.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-600 rounded-full text-sm text-cyan-300">
                          {transaction.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(transaction.dateOfSale).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex justify-between items-center text-gray-400">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-all"
            >
              ← Previous
            </button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-all"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-cyan-600 to-cyan-800 p-6 rounded-xl">
              <div className="text-sm text-cyan-100 mb-2">Total Sales</div>
              <div className="text-3xl font-bold text-white">
                ${stats.totalSaleAmount.toFixed(2)}
              </div>
              <div className="text-xs text-cyan-200 mt-2">in {selectedMonth || 'all months'}</div>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-xl">
              <div className="text-sm text-blue-100 mb-2">Sold Items</div>
              <div className="text-3xl font-bold text-white">{stats.totalSoldItems}</div>
              <div className="text-xs text-blue-200 mt-2">successful transactions</div>
            </div>
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-6 rounded-xl">
              <div className="text-sm text-purple-100 mb-2">Unsold Items</div>
              <div className="text-3xl font-bold text-white">{stats.totalNotSoldItems}</div>
              <div className="text-xs text-purple-200 mt-2">remaining inventory</div>
            </div>
          </div>

          {/* Bar Chart Section */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
            <h2 className="text-xl font-semibold text-cyan-400 mb-4">
              Price Distribution {selectedMonth && `- ${selectedMonth}`}
            </h2>
            <div className="h-[400px]">
              <RechartsResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <XAxis
                    dataKey="range"
                    stroke="#94a3b8"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    tickMargin={10}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickFormatter={(value) => `${value}`}
                  />
                  <RechartsTooltip 
                    content={<CustomBarTooltip />}
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}  // Semi-transparent highlight
                  />
                  <Bar
                    dataKey="count"
                    fill={CHART_COLORS.bar}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={CHART_COLORS.bar}
                        fillOpacity={0.8}
                        strokeWidth={1}
                        stroke={CHART_COLORS.barHover}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </RechartsResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart Section */}
          {pieData.length > 0 && (
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
              <h2 className="text-xl font-semibold text-cyan-400 mb-4">
                Category Distribution
              </h2>
              <div className="h-[300px]">
                <RechartsResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={true}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS.pie[index % CHART_COLORS.pie.length]}
                        />
                      ))}
                    </Pie>
                    <Legend 
                      formatter={(value) => <span className="text-gray-300">{value}</span>}
                    />
                    <RechartsTooltip 
                      content={<CustomPieTooltip />}
                    />
                  </PieChart>
                </RechartsResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;