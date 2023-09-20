import Beanstalk, { BeanstalkConsumer, BeanstalkConsumerWithBrowser, defaultBrowserOpt } from '../library/beanstalk.js';
import getMetaDataAnime from './getMetadataAnime.js';
import connectDb from '../library/db.js';
import getSourceRequest from './getSourceRequest.js';
import logger from './utilities/logger.js';
import getAndSaveResponseFromRequrement from './dowloader.js';

const episodeGetRequermentTubeName = 'bilibili-bstation-eps-anime';
const animeCollectionName = 'bilibili-bstation-anime';
const animeIdTubeName = 'bilibili-bstation-anime-id';
const sourceRequestTubeName = 'bilibili-bstation-source-request';
const savePictureTubeName = 'bilibili-bstation-save-picture';


(async () => {
  // worker for metadata and episodes work includes pusher work
  const sourceRequestTube = new Beanstalk(sourceRequestTubeName);
  const episodeGetRequermentTube = new Beanstalk(episodeGetRequermentTubeName);
  const savePictureTube = new Beanstalk(savePictureTubeName);

  const client = await connectDb();
  const animeCollection = client.db().collection(animeCollectionName);
  animeCollection.createIndex({ sourceId: 1 }, { unique: true });
  BeanstalkConsumerWithBrowser(animeIdTubeName, async (browser, job) => {
    console.log(animeIdTubeName, job);
    const metadata = await getMetaDataAnime(browser, job);
    if (metadata.ok == true) {
      try {
        await savePictureTube.body(metadata.result.coverImage);
        metadata.result.coverImage = process.env.DIR_THUBNAIL_PICTURE + metadata.result.coverImage.split('/').pop();
        const result = await animeCollection.insertOne(metadata.result);
        episodeGetRequermentTube.body({ url: job, sourceId: metadata.result.sourceId });
      } catch (error) {
        logger(`worker with tube: ${animeIdTubeName} and job: ${job} ERROR= `, error.message);
      }
    } else {
      logger(`worker with tube: ${animeIdTubeName} and job: ${job} ERROR= `, metadata.message);
    }
  });

  const requirementBrowserOpt = defaultBrowserOpt;
  requirementBrowserOpt.headless = false;
  BeanstalkConsumerWithBrowser(episodeGetRequermentTubeName, async (browser, job) => {
    console.log(episodeGetRequermentTubeName, job);
    const requirement = await getSourceRequest(browser, job.url);
    sourceRequestTube.body(...requirement.map((require) => {
      const { video, audio, subtitles, episode } = require;
      return {
        video,
        audio,
        subtitles,
        path: `anime_${job.sourceId}/${episode}`
      };
    }));
  }, requirementBrowserOpt);


  const dowloaderWorker = async (job) => {
    console.log(sourceRequestTubeName, job);
    if (await getAndSaveResponseFromRequrement(job, job.path)) {
      logger(`job: ${job.episode}, success`);
    } else {
      logger(`job: ${job.episode}, Error`);
    }
  };

  const dowloaderWorkerRunner = async (calledJob = null) => {
    let job = calledJob || (await sourceRequestTube.put());
    try {
      while (job) {
        await dowloaderWorker(job);
        console.log('dowloaderWorkerRunner ', job);
        job = await sourceRequestTube.put();
      }
    } catch (err) {
      console.log(err);
    }

    console.log('now dowloaderWorkerRunner use interval');
    const interval = setInterval(async () => {
      const tryGetJob = await sourceRequestTube.put();
      if (tryGetJob) {
        clearInterval(interval);
        dowloaderWorkerRunner(tryGetJob);
      }
    }, 5000);
  };

  dowloaderWorkerRunner();

  const dowloadPicture = async (job, modules) => {
    const [fetch, pipeline, createWriteStream, existsSync] = modules;
    const filename = job.split('/').pop();
    if (existsSync(process.env.DIR_THUBNAIL_PICTURE + filename)) {
      logger(`dowloadPicture job: ${filename} already exist`);
    }
    await pipeline(await fetch(job), createWriteStream(process.env.DIR_THUBNAIL_PICTURE + filename));
  };
  const dowloadPictureRunner = async (calledJob = null) => {
    let job = calledJob || (await savePictureTube.put());
    const fs = await import('fs');
    let modules = await Promise.all([
      (await import('node-fetch')).default,
      (await import('./dowloader.js')).pipeline,
    ]);
    modules.push(fs.createWriteStream, fs.existsSync);
    try {
      while (job) {
        await dowloadPicture(job, modules);
        job = await savePictureTube.put();
      }
    } catch (err) {
      logger(err);
    }

    logger('now dowloadPictureRunner use interval');
    modules = null;
    const interval = setInterval(async () => {
      const tryGetJob = await savePictureTube.put();
      if (tryGetJob) {
        clearInterval(interval);
        dowloadPictureRunner(tryGetJob);
      }
    }, 5000);
  };

  dowloadPictureRunner();

})()
  .then(() => logger('Process bilibili bstation, Done.'))
  .catch((err) => console.error(err));
