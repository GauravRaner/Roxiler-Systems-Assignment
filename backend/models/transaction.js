import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  id: String,
  title: String,
  description: String,
  price: Number,
  dateOfSale: Date,
  category: String,
  isSold: Boolean
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;