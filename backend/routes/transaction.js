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
    const { page = 1, perPage = 10, search = '' } = req.query;
    const pageNumber = parseInt(page, 10);
    const perPageNumber = parseInt(perPage, 10);

    // Improved search query
    const searchQuery = search
      ? {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            // Handle price search properly
            {
              price: !isNaN(search) ? Number(search) : null
            },
            { category: { $regex: search, $options: 'i' } }
          ].filter(condition => 
            // Remove null conditions
            Object.values(condition)[0] !== null
          )
        }
      : {};

    const skip = (pageNumber - 1) * perPageNumber;

    const transactions = await Transaction.find(searchQuery)
      .sort({ dateOfSale: -1 }) // Sort by date
      .skip(skip)
      .limit(perPageNumber);

    const totalCount = await Transaction.countDocuments(searchQuery);
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
    res.status(500).json({ error: 'Error fetching transactions' });
  }
});


router.get('/statistics', async (req, res) => {
  try {
    const { month } = req.query;

    let dateQuery = {};
    
    if (month) {
      const monthNumber = parseInt(month);
      dateQuery = {
        $expr: {
          $eq: [{ $month: '$dateOfSale' }, monthNumber]
        }
      };
    }

    const statistics = await Transaction.aggregate([
      {
        $match: dateQuery
      },
      {
        $group: {
          _id: null,
          totalSaleAmount: { $sum: '$price' },
          totalSoldItems: { 
            $sum: { $cond: [{ $eq: ['$isSold', true] }, 1, 0] }
          },
          totalNotSoldItems: { 
            $sum: { $cond: [{ $eq: ['$isSold', false] }, 1, 0] }
          }
        }
      }
    ]);

    const result = statistics.length > 0 ? statistics[0] : {
      totalSaleAmount: 0,
      totalSoldItems: 0,
      totalNotSoldItems: 0
    };

    delete result._id;
    
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching statistics' });
  }
});

router.get('/price-range-chart', async (req, res) => {
  try {
    const { month } = req.query;  

    if (!month) {
      return res.status(400).json({ error: 'Please provide a valid month' });
    }

    const parsedMonth = parseInt(month, 10) - 1;  
    if (isNaN(parsedMonth) || parsedMonth < 0 || parsedMonth > 11) {
      return res.status(400).json({ error: 'Invalid month' });
    }

    const startDate = new Date(new Date().getFullYear(), parsedMonth, 1);
    const endDate = new Date(new Date().getFullYear(), parsedMonth + 1, 0, 23, 59, 59, 999);

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

    const result = priceRanges.map((range) => {
      const existingStat = statistics.find((stat) => stat._id === range.range);
      return {
        priceRange: range.range,
        count: existingStat ? existingStat.count : 0, 
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
    const { month } = req.query;  

    
    if (!month) {
      return res.status(400).json({ error: 'Please provide a valid month' });
    }

    const parsedMonth = parseInt(month, 10) - 1;  
    if (isNaN(parsedMonth) || parsedMonth < 0 || parsedMonth > 11) {
      return res.status(400).json({ error: 'Invalid month' });
    }

    const startDate = new Date(new Date().getFullYear(), parsedMonth, 1);
    const endDate = new Date(new Date().getFullYear(), parsedMonth + 1, 0, 23, 59, 59, 999);

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
          _id: '$category', 
          count: { $sum: 1 }, 
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]);

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

    if (!month) {
      return res.status(400).json({ error: 'Please provide a valid month' });
    }

    const monthNumber = parseInt(month);
    const dateQuery = {
      $expr: {
        $eq: [{ $month: '$dateOfSale' }, monthNumber]
      }
    };

    // Get statistics
    const statistics = await Transaction.aggregate([
      {
        $match: dateQuery
      },
      {
        $group: {
          _id: null,
          totalSaleAmount: { $sum: '$price' },
          totalSoldItems: { 
            $sum: { $cond: [{ $eq: ['$isSold', true] }, 1, 0] }
          },
          totalNotSoldItems: { 
            $sum: { $cond: [{ $eq: ['$isSold', false] }, 1, 0] }
          }
        }
      }
    ]);

    // Get price range data
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
      { range: '901-above', min: 901, max: Infinity }
    ];

    const priceRangeData = await Transaction.aggregate([
      {
        $match: dateQuery
      },
      {
        $bucket: {
          groupBy: '$price',
          boundaries: [0, 101, 201, 301, 401, 501, 601, 701, 801, 901],
          default: '901-above',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    // Get category data
    const categoryData = await Transaction.aggregate([
      {
        $match: dateQuery
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    const response = {
      saleStats: statistics[0] || {
        totalSaleAmount: 0,
        totalSoldItems: 0,
        totalNotSoldItems: 0
      },
      priceRangeChart: priceRangeData.map(item => ({
        range: item._id === '901-above' ? '901-above' : `${item._id}-${item._id + 99}`,
        count: item.count
      })),
      categoryPieChart: categoryData.map(item => ({
        category: item._id,
        count: item.count
      }))
    };

    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching combined statistics' });
  }
});



export default router;