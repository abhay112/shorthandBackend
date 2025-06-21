import { config } from 'dotenv';
config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });

export const CREDENTIALS = process.env.CREDENTIALS === 'true';
export const { NODE_ENV, PORT, DB_HOST, DB_PORT, DB_DATABASE, SECRET_KEY, LOG_FORMAT, LOG_DIR, ORIGIN, MONGO_URI } = process.env;

// Combine individual components (if you prefer not to use MONGO_URI directly)
export const dbConnection = {
  url: MONGO_URI || `mongodb://${DB_HOST}:${DB_PORT}/${DB_DATABASE}`,
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 5000,
  },
};
