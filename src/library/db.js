import { MongoClient } from 'mongodb';
import logger from '../bilibili-bstation/utilities/logger.js';

const connectDb = async () => {
  const client = new MongoClient(process.env.CRAWLER_DB);

  try {
    await client.connect();
    logger('Connected to MongoDB');
    return client;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
};


export default connectDb;
