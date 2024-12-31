import express from 'express';
import cors from 'cors';
import connectDB from './database/database.js';
import dotenv from 'dotenv';
import transactionRoutes from './routes/transaction.js';
dotenv.config();


const app = express();
const PORT=process.env.PORT || 5000;
app.use(express.json());
app.use(cors());

app.use('/api/transactions',transactionRoutes);



app.listen(PORT,()=>{
  connectDB();
    console.log(`Server is running on port ${PORT}`)
})


