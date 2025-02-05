import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/transactions';

const api = {
  getTransactions: async (page = 1, perPage = 10, search = '') => {
    const response = await axios.get(`${API_BASE_URL}/transactions`, {
      params: { page, perPage, search }
    });
    return response.data;
  },

  getStatistics: async (month) => {
    const response = await axios.get(`${API_BASE_URL}/statistics`, {
      params: { month }
    });
    return response.data;
  },

  getPriceRangeChart: async (month) => {
    const response = await axios.get(`${API_BASE_URL}/price-range-chart`, {
      params: { month }
    });
    return response.data;
  },

  getCategoryPieChart: async (month) => {
    const response = await axios.get(`${API_BASE_URL}/category-pie-chart`, {
      params: { month }
    });
    return response.data;
  },

  getCombinedStats: async (month) => {
    const response = await axios.get(`${API_BASE_URL}/combined-stats`, {
      params: { month }
    });
    return response.data;
  }
};

export default api; 