import express from 'express';
import axios from 'axios';
import Transaction from '../models/transaction.js';

const router = express.Router();


router.get('/initialize-database', async (req, res) => {
  try {
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    const transactions = response.data;

    // Remove existing data and insert new seed data
    await Transaction.deleteMany({});
    await Transaction.insertMany(transactions);

    res.status(200).json({ message: 'Database initialized with seed data.' });
  } catch (error) {
    res.status(500).json({ error: 'Error initializing database', details: error.message });
  }
});


router.get('/transactions', async (req, res) => {
  try {
    // Extract query parameters
    const { page = 1, perPage = 10, search = '' } = req.query;

    // Parse page and perPage to integers
    const pageNumber = parseInt(page, 10);
    const perPageNumber = parseInt(perPage, 10);

    // Build search query based on search term
    const searchQuery = search
      ? {
          $or: [
            { title: { $regex: search, $options: 'i' } }, // Case-insensitive regex search on title
            { description: { $regex: search, $options: 'i' } }, // Case-insensitive regex search on description
            { price: { $regex: search, $options: 'i' } }, // Case-insensitive regex search on price
          ],
        }
      : {};

    // Calculate pagination
    const skip = (pageNumber - 1) * perPageNumber;

    // Find transactions with search and pagination
    const transactions = await Transaction.find(searchQuery)
      .skip(skip)
      .limit(perPageNumber);

    // Get total count of records for pagination info
    const totalCount = await Transaction.countDocuments(searchQuery);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / perPageNumber);

    res.status(200).json({
      data: transactions,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalCount,
        perPage: perPageNumber,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching transactions', details: error.message });
  }
});


router.get('/statistics', async (req, res) => {
  try {
    const { year, month } = req.query;  // Year and Month should be passed as query parameters

    // Validate year and month
    if (!year || !month) {
      return res.status(400).json({ error: 'Please provide both year and month' });
    }

    // Parse the year and month to integers
    const parsedYear = parseInt(year, 10);
    const parsedMonth = parseInt(month, 10) - 1; // JavaScript months are 0-based (0 = January)

    if (isNaN(parsedYear) || isNaN(parsedMonth) || parsedMonth < 0 || parsedMonth > 11) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    // Define the start and end of the month
    const startDate = new Date(parsedYear, parsedMonth, 1);
    const endDate = new Date(parsedYear, parsedMonth + 1, 0, 23, 59, 59, 999);

    // Aggregate the transactions for the selected month
    const statistics = await Transaction.aggregate([
      {
        $match: {
          dateOfSale: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: '$isSold',  // Group by 'isSold' field (true/false)
          totalAmount: { $sum: { $cond: [{ $eq: ['$isSold', true] }, '$price', 0] } },
          soldCount: { $sum: { $cond: [{ $eq: ['$isSold', true] }, 1, 0] } },
          notSoldCount: { $sum: { $cond: [{ $eq: ['$isSold', false] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          isSold: '$_id',
          totalAmount: 1,
          soldCount: 1,
          notSoldCount: 1,
        },
      },
    ]);

    // Structure the response
    const result = {
      totalSaleAmount: 0,
      totalSoldItems: 0,
      totalNotSoldItems: 0,
    };

    // Extract and populate the result based on the aggregation
    statistics.forEach((stat) => {
      if (stat.isSold === true) {
        result.totalSaleAmount = stat.totalAmount;
        result.totalSoldItems = stat.soldCount;
      } else {
        result.totalNotSoldItems = stat.notSoldCount;
      }
    });

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching statistics', details: error.message });
  }
});

router.get('/price-range-chart', async (req, res) => {
  try {
    const { month } = req.query;  // Get the month from query parameters

    // Validate month
    if (!month) {
      return res.status(400).json({ error: 'Please provide a valid month' });
    }

    const parsedMonth = parseInt(month, 10) - 1;  // Convert to 0-based month (0 = January)
    if (isNaN(parsedMonth) || parsedMonth < 0 || parsedMonth > 11) {
      return res.status(400).json({ error: 'Invalid month' });
    }

    // Define the start and end of the month (ignoring the year)
    const startDate = new Date(new Date().getFullYear(), parsedMonth, 1);
    const endDate = new Date(new Date().getFullYear(), parsedMonth + 1, 0, 23, 59, 59, 999);

    // Price ranges: [0-100], [101-200], ..., [901-above]
    const priceRanges = [
      { range: '0-100', min: 0, max: 100 },
      { range: '101-200', min: 101, max: 200 },
      { range: '201-300', min: 201, max: 300 },
      { range: '301-400', min: 301, max: 400 },
      { range: '401-500', min: 401, max: 500 },
      { range: '501-600', min: 501, max: 600 },
      { range: '601-700', min: 601, max: 700 },
      { range: '701-800', min: 701, max: 800 },
      { range: '801-900', min: 801, max: 900 },
      { range: '901-above', min: 901, max: Infinity },
    ];

    // Aggregate the transactions to count the number of items in each price range
    const statistics = await Transaction.aggregate([
      {
        $match: {
          dateOfSale: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $project: {
          price: 1,
        },
      },
      {
        $addFields: {
          priceRange: {
            $switch: {
              branches: priceRanges.map((range) => ({
                case: { $and: [{ $gte: ['$price', range.min] }, { $lte: ['$price', range.max] }] },
                then: range.range,
              })),
              default: 'Unknown', // In case the price is null or invalid
            },
          },
        },
      },
      {
        $group: {
          _id: '$priceRange',
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          _id: 1,  // Sort by the range label
        },
      },
    ]);

    // Format the response
    const result = priceRanges.map((range) => {
      const existingStat = statistics.find((stat) => stat._id === range.range);
      return {
        priceRange: range.range,
        count: existingStat ? existingStat.count : 0, // If no items match, return count = 0
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching price range statistics', details: error.message });
  }
});


router.get('/category-pie-chart', async (req, res) => {
  try {
    const { month } = req.query;  // Get the month from query parameters

    // Validate month
    if (!month) {
      return res.status(400).json({ error: 'Please provide a valid month' });
    }

    const parsedMonth = parseInt(month, 10) - 1;  // Convert to 0-based month (0 = January)
    if (isNaN(parsedMonth) || parsedMonth < 0 || parsedMonth > 11) {
      return res.status(400).json({ error: 'Invalid month' });
    }

    // Define the start and end of the month (ignoring the year)
    const startDate = new Date(new Date().getFullYear(), parsedMonth, 1);
    const endDate = new Date(new Date().getFullYear(), parsedMonth + 1, 0, 23, 59, 59, 999);

    // Aggregate the transactions to get unique categories and their count
    const statistics = await Transaction.aggregate([
      {
        $match: {
          dateOfSale: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: '$category',  // Group by category
          count: { $sum: 1 }, // Count the number of items in each category
        },
      },
      {
        $sort: {
          count: -1,  // Sort by count (optional)
        },
      },
    ]);

    // Format the response as an array of objects with category and count
    const result = statistics.map((stat) => ({
      category: stat._id,
      count: stat.count,
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching category statistics', details: error.message });
  }
});


router.get('/combined-stats', async (req, res) => {
  try {
    const { month } = req.query;

    // Validate month
    if (!month) {
      return res.status(400).json({ error: 'Please provide a valid month' });
    }

    const parsedMonth = parseInt(month, 10) - 1;  // Convert to 0-based month (0 = January)
    if (isNaN(parsedMonth) || parsedMonth < 0 || parsedMonth > 11) {
      return res.status(400).json({ error: 'Invalid month' });
    }

    const startDate = new Date(new Date().getFullYear(), parsedMonth, 1);
    const endDate = new Date(new Date().getFullYear(), parsedMonth + 1, 0, 23, 59, 59, 999);

    // Fetch price range statistics
    const priceRangeStats = await Transaction.aggregate([
      {
        $match: {
          dateOfSale: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $project: {
          price: 1,
        },
      },
      {
        $addFields: {
          priceRange: {
            $switch: {
              branches: [
                { case: { $and: [{ $gte: ['$price', 0] }, { $lte: ['$price', 100] }] }, then: '0-100' },
                { case: { $and: [{ $gte: ['$price', 101] }, { $lte: ['$price', 200] }] }, then: '101-200' },
                { case: { $and: [{ $gte: ['$price', 201] }, { $lte: ['$price', 300] }] }, then: '201-300' },
                { case: { $and: [{ $gte: ['$price', 301] }, { $lte: ['$price', 400] }] }, then: '301-400' },
                { case: { $and: [{ $gte: ['$price', 401] }, { $lte: ['$price', 500] }] }, then: '401-500' },
                { case: { $and: [{ $gte: ['$price', 501] }, { $lte: ['$price', 600] }] }, then: '501-600' },
                { case: { $and: [{ $gte: ['$price', 601] }, { $lte: ['$price', 700] }] }, then: '601-700' },
                { case: { $and: [{ $gte: ['$price', 701] }, { $lte: ['$price', 800] }] }, then: '701-800' },
                { case: { $and: [{ $gte: ['$price', 801] }, { $lte: ['$price', 900] }] }, then: '801-900' },
                { case: { $and: [{ $gte: ['$price', 901] }, { $lte: ['$price', Infinity] }] }, then: '901-above' },
              ],
              default: 'Unknown',
            },
          },
        },
      },
      {
        $group: {
          _id: '$priceRange',
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const priceRangeData = [
      { range: '0-100', count: 0 },
      { range: '101-200', count: 0 },
      { range: '201-300', count: 0 },
      { range: '301-400', count: 0 },
      { range: '401-500', count: 0 },
      { range: '501-600', count: 0 },
      { range: '601-700', count: 0 },
      { range: '701-800', count: 0 },
      { range: '801-900', count: 0 },
      { range: '901-above', count: 0 },
    ];

    // Combine fetched data with default counts for missing ranges
    priceRangeStats.forEach(stat => {
      const rangeIndex = priceRangeData.findIndex(item => item.range === stat._id);
      if (rangeIndex >= 0) {
        priceRangeData[rangeIndex].count = stat.count;
      }
    });

    // Fetch category pie chart statistics
    const categoryStats = await Transaction.aggregate([
      {
        $match: {
          dateOfSale: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: '$category', // Group by category
          count: { $sum: 1 },
        },
      },
    ]);

    // Format category data for pie chart
    const categoryPieChartData = categoryStats.map(stat => ({
      category: stat._id,
      count: stat.count,
    }));

    // Fetch statistics for total sale and sold items (or other desired statistics)
    const totalSaleStats = await Transaction.aggregate([
      {
        $match: {
          dateOfSale: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$price' },
          soldCount: { $sum: { $cond: [{ $eq: ['$isSold', true] }, 1, 0] } },
          notSoldCount: { $sum: { $cond: [{ $eq: ['$isSold', false] }, 1, 0] } },
        },
      },
    ]);

    // Format sale statistics data
    const saleStatsData = totalSaleStats.length > 0 ? totalSaleStats[0] : { totalAmount: 0, soldCount: 0, notSoldCount: 0 };

    // Combine all data into one response object
    const combinedData = {
      priceRangeChart: priceRangeData,
      categoryPieChart: categoryPieChartData,
      saleStats: {
        totalSaleAmount: saleStatsData.totalAmount,
        totalSoldItems: saleStatsData.soldCount,
        totalNotSoldItems: saleStatsData.notSoldCount,
      },
    };

    // Send combined response
    res.status(200).json(combinedData);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching combined statistics', details: error.message });
  }
});



export default router;