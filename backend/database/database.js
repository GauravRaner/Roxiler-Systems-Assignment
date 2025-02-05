import mongoose from "mongoose";
import axios from "axios";
import Transaction from "../models/transaction.js";

const seedDatabase = async () => {
  try {
    const count = await Transaction.countDocuments();
    if (count > 0) {
      console.log("Database already contains data, skipping seed");
      return;
    }

    const response = await axios.get("https://s3.amazonaws.com/roxiler.com/product_transaction.json");
    const transactions = response.data;

    const transformedTransactions = transactions.map(transaction => ({
      ...transaction,
      dateOfSale: new Date(transaction.dateOfSale),
      isSold: Boolean(transaction.sold) 
    }));

    await Transaction.insertMany(transformedTransactions);
    console.log("Database seeded successfully with initial data");
  } catch (error) {
    console.error("Error seeding database:", error.message);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await seedDatabase();
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;