
import dotenv from 'dotenv';
dotenv.config(); 

export const CREDENTIALS = process.env.CREDENTIALS === 'true';
export const {
  NODE_ENV,
  PORT = 3000,
  DB_HOST,
  DB_PORT,
  DB_DATABASE,
  SECRET_KEY,
  LOG_FORMAT,
  LOG_DIR,
  ORIGIN,
  MONGO_URI,
} = process.env;

export const dbConnection = {
  url: process.env.MONGO_URI || `mongodb://${DB_HOST}:${DB_PORT}/${DB_DATABASE}`,
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 5000,
  },
};
