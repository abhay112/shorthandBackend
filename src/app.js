// server.js or server.ts
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import pdfRouter from './routes/pdf.js'; 
import commonRoutes from './routes/index.js';
import dotenv from 'dotenv';
dotenv.config(); 

import { dbConnection, PORT } from './config/index.js'; 
console.log(process.env.MONGO_URI); 

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  next();
});

app.get('/', (req, res) => {
  res.send('Shorthand Typing Test API is running!');
});

app.use('/api/pdf', pdfRouter);
app.use('/api/v1', commonRoutes);

console.log(dbConnection.url)

mongoose
  .connect(dbConnection.url, dbConnection.options)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });

