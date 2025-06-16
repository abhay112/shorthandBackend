const express = require('express');
const cors = require('cors'); 
const pdfRouter = require('./routes/pdf');

const app = express();

// Enable CORS for all origins (development)
app.use(cors());

// If you want to restrict to a specific origin:
// app.use(cors({ origin: 'http://localhost:3001' })); // Replace with your frontend URL

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
