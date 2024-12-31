import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const Dashboard = () => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [stats, setStats] = useState({
    totalSaleAmount: 0,
    totalSoldItems: 0,
    totalNotSoldItems: 0
  });
  const [chartData, setChartData] = useState([]);

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await axios.get(
          `http://localhost:8000/api/transactions/transactions?page=${currentPage}&limit=${perPage}&search=${search}`
        );
        const { data, pagination } = response.data;
        setTransactions(data || []);
        setCurrentPage(pagination.currentPage);
        setTotalPages(pagination.totalPages);
      } catch (err) {
        setError("Failed to fetch transactions");
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [currentPage, perPage, search]);

  // Fetch statistics and chart data
  useEffect(() => {
    const fetchStats = async () => {
      if (!selectedMonth) return;
      try {
        const monthIndex = months.indexOf(selectedMonth) + 1;
        const response = await axios.get(
          `http://localhost:8000/api/transactions/combined-stats?month=${monthIndex}`
        );
        setStats(response.data.saleStats);
        setChartData(response.data.priceRangeChart);
      } catch (err) {
        setError("Failed to fetch statistics");
      }
    };
    fetchStats();
  }, [selectedMonth]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1); // Reset to page 1 on search
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
    setCurrentPage(1); // Reset to page 1 on filter change
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.dateOfSale);
    return (
      (search === "" || transaction.title.toLowerCase().includes(search.toLowerCase())) &&
      (selectedMonth === "" || transactionDate.getMonth() === months.indexOf(selectedMonth))
    );
  });

  return (
    <div className="flex flex-col h-full bg-gradient-to-r from-teal-400 to-yellow-200">
      <div className="flex flex-row flex-1">
        {/* Transaction Table Section */}
        <div className="w-1/2 h-[300px] p-4">
          <h1 className="text-center font-bold text-2xl text-white">Transaction Table</h1>

          {/* Search and Filter */}
          <div className="my-4 flex justify-between items-center px-10 mx-8">
            <input
              type="text"
              placeholder="Search transaction"
              className="p-2 bg-yellow-200 outline-none font-bold text-center text-sm placeholder:text-black rounded-3xl w-full md:w-auto"
              value={search}
              onChange={handleSearchChange}
            />
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="p-2 text-sm bg-yellow-300 outline-none placeholder:text-black rounded-lg"
            >
              <option value="">Select month</option>
              {months.map((month, index) => (
                <option value={month} key={index}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] text-left rtl:text-right text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-white uppercase bg-gray-700 dark:bg-gray-700 dark:text-white-400">
                <tr>
                  <th scope="col" className="px-1 py-1">ID</th>
                  <th scope="col" className="px-1 py-1">Transaction</th>
                  <th scope="col" className="px-1 py-1">Price</th>
                  <th scope="col" className="px-1 py-1">Category</th>
                  <th scope="col" className="px-1 py-1">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center text-white py-4">Loading...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="5" className="text-center text-red-500 py-4">{error}</td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-white py-4">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction, index) => (
                    <tr
                      key={index}
                      className="bg-gray-700 text-white border dark:bg-gray-800 hover:bg-gray-200 hover:text-gray-900"
                    >
                      <th scope="row" className="px-2 py-2 font-medium whitespace-nowrap">
                        {transaction.id}
                      </th>
                      <td className="px-1 py-1">{transaction.title}</td>
                      <td className="px-1 py-1">${transaction.price}</td>
                      <td className="px-1 py-1">{transaction.category}</td>
                      <td className="px-1 py-1">{new Date(transaction.dateOfSale).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="text-white flex justify-between items-center px-10 mt-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) =>
                  prev < totalPages ? prev + 1 : prev
                )
              }
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>

        {/* Summary Boxes Section */}
        <div className="w-1/2 h-[300px] text-white flex flex-col items-center justify-center mt-24">
          <h1 className='text-center font-bold text-2xl'>Transactions Statistics</h1>
          <div className=" mt-4 px-4 bg-gradient-to-r from-[#f2709c] to-[#ff9472] p-10 rounded-lg">
            <h1 className='text-center font-semibold text-2xl mb-5'>Statistics: {selectedMonth}</h1>
            <div className='grid grid-cols-3 gap-4'>
              <div className="p-4 bg-gradient-to-r from-[#1CD8D2] to-[#93EDC7] rounded-lg shadow-md flex flex-col justify-center items-center text-center text-white h-[150px] w-[150px]">
                <h2 className="text-md font-bold">Total Sale</h2>
                <p className="text-xl font-extrabold">${stats.totalSaleAmount.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-gradient-to-r from-[#1488CC] to-[#2B32B2] rounded-lg shadow-md text-center text-white flex flex-col justify-center items-center">
                <h2 className="text-md font-bold">Sold Items</h2>
                <p className="text-xl font-extrabold">{stats.totalSoldItems}</p>
              </div>
              <div className="p-4 bg-red-500 rounded-lg shadow-md text-center text-white flex flex-col justify-center items-center">
                <h2 className="text-md font-bold">Unsold Items</h2>
                <p className="text-xl font-extrabold">{stats.totalNotSoldItems}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Price Range Chart */}
      <div className='text-red-500  mt-20 '>
        <BarChart
          width={800}
          height={400}
          data={chartData}
          className='bg-gradient-to-r from-slate-900 to-slate-700 rounded-lg shadow-md'
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <XAxis dataKey="range" />
          <YAxis />
          <Tooltip className='bg-red-500' />
          <Bar dataKey="count" fill="#ff0000" color='red' className='bg-red-500' />
        </BarChart>
      </div>
    </div>
  );
};

export default Dashboard;
