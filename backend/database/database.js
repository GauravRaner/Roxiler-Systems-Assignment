import mongoose from "mongoose";
import axios from "axios";
import Transaction from "../models/transaction.js";
const seedDatabase = async () => {
  try {
    const response = await axios.get("https://s3.amazonaws.com/roxiler.com/product_transaction.json");
    const transactions = response.data;

    await Transaction.insertMany(transactions);

    console.log("Database seeded with initial data");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
};

seedDatabase();
const connectDB=()=>{
    mongoose.connect(process.env.MONGO_URI).then(()=>{
        console.log(`Database connected with mongoose`)
    }).catch((err)=>{
        console.log(err)
    })
}

export default connectDB;