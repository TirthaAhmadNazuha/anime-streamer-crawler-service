import { config } from 'dotenv';
config();
import getAnimeLink from './getAnimeLink.js';
import Beanstalk from '../library/beanstalk.js';
import getEpsDetail from './getEpsDetail.js';
import connectDb from '../library/db.js';
import { getSourceDl, getURLDl } from './getSourceVideo.js';

const workGettingAnimeLinks = async () => {
  try {
    const tube = new Beanstalk('samehadaku-anime-link');
    for await (const linkResult of getAnimeLink()) {
      await tube.body(...linkResult);
      console.log('[workGettingAnimeLinks] : success append jobs \n');
    }
  } catch (error) {
    console.log('[workGettingAnimeLinks][ERROR] :', error);
  }
};

const workGettingEpsDetail = async (newJob = null) => {
  try {
    const tube = new Beanstalk('samehadaku-anime-link');
    const client = await connectDb();
    const db = client.db();
    const collection = db.collection('samehadaku-anime-detail');
    await collection.createIndex({ url: 1 }, { unique: true });
    let job = newJob || await tube.put();
    const sourceTube = new Beanstalk('samehadaku-eps-link');
    while (job) {
      console.log(`[workGettingEpsDetail] : Job "${job}" begin processing... \n`);
      const hasStored = await collection.findOne({ url: job });
      if (hasStored == null) {
        const { metadata, epsLink } = await getEpsDetail(job);
        try {
          await collection.insertOne(metadata);
        } catch (err) {
          console.error('[workGettingEpsDetail][HANDLED_ERROR] :', `Fail to store metadata with job "${job}"`);
        }
        await sourceTube.body(...epsLink);
      }
      job = await tube.put();
    }

    await client.close();
  } catch (error) {
    console.log('[workGettingEpsDetail][ERROR] :', error);

  }
};

const workGettingSourceVideoEps = async () => {
  try {
    const tube = new Beanstalk('samehadaku-eps-link');
    let job = await tube.put();
    const downloadTube = new Beanstalk('samehadaku-video-eps-download');
    while (job) {
      console.log(`[workGettingSourceVideoEps] : Job "${job}" begin processing... \n`);
      const dlSource = await getSourceDl(await getURLDl(job));
      console.log('dlSource: ', dlSource);
      if (dlSource) {
        downloadTube.body(dlSource);
      }
      job = await tube.put();
    }
    setTimeout(() => {

    }, timeout);
  } catch (error) {
    console.log('[workGettingSourceVideoEps][ERROR] :', error);
  }
};

const main = async () => {
  try {
    const works = [
      // workGettingAnimeLinks(),
      // workGettingEpsDetail(),
      workGettingSourceVideoEps(),
    ];

    await Promise.all(works);
  } catch (error) {
    console.error('!! ROOT ERROR !! == \n', error);
  }
};

main();
