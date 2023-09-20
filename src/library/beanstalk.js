import { config } from 'dotenv';
config();
import axios from 'axios';
import logger from '../bilibili-bstation/utilities/logger.js';

const Beanstalk = class {
  constructor(tubename) {
    this.origin = process.env.BEANSTALK_SERVICE;
    this.url = `${this.origin}tubes/${tubename}`;
  }

  async put() {
    const job = (await axios.get(this.url)).data;
    return job != 'null' ? job : null;
  }

  async body(...job) {
    await axios.post(this.url + '?spreading=1', job);
  }
};

export const defaultBrowserOpt = { headless: 'new', args: ['--no-sandbox', '--mute-audio'], executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' };

export const BeanstalkConsumerWithBrowser = async (tubename, callbackfn, browserOpt = defaultBrowserOpt, calledJob = null) => {
  let browser = await (await import('puppeteer')).launch(browserOpt);
  const tube = new Beanstalk(tubename);
  let job = calledJob || (await tube.put());
  try {
    while (job) {
      await callbackfn(browser, job);
      job = await tube.put();
    }
  } catch (err) {
    logger('working error', err);
  }

  logger('now job is null, starting use interval');
  await browser.close();
  browser = null;

  const interval = setInterval(async () => {
    const job = await tube.put();
    if (job) {
      clearInterval(interval);
      BeanstalkConsumerWithBrowser(tubename, callbackfn, browserOpt, job);
      callbackfn = null;
    }
  }, 5000);
};

export const BeanstalkConsumer = async (tubename, callbackfn, calledJob = null) => {
  const tube = new Beanstalk(tubename);
  let job = calledJob || (await tube.put());
  try {
    while (job) {
      console.log(job);
      await callbackfn(job);
      job = await tube.put();
    }
  } catch (err) {
    logger('working error', err);
  }

  logger('now job is null, starting use interval');

  const interval = setInterval(async () => {
    const job = await tube.put();
    if (job) {
      clearInterval(interval);
      BeanstalkConsumerWithBrowser(tubename, callbackfn, job);
      callbackfn = null;
    }
  }, 5000);
};


export default Beanstalk;
