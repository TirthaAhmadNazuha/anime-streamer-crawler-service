import { config } from 'dotenv';
config();
import logger from './utilities/logger.js';

(async () => {
  const client = await (await import('../library/db.js')).default();
  const db = client.db();
  const animeCollection = db.collection('bilibili-bstation-anime');

  // await animeCollection.updateOne({ _id: new ObjectId('64fd953daed859d632a7a015') }, {
  //   $push: {
  //     tags: 'Isekai'
  //   }
  // });

  await animeCollection.deleteOne();

  // get all
  logger('try getting');
  logger(await animeCollection.find().toArray());
  await client.close();

})();
