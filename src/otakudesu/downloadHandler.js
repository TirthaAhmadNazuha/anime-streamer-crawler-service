import Handler from './handler.js';
import Beanstalk from '../library/beanstalk.js';
import { createWriteStream, readFileSync } from 'fs';
import fetch from 'node-fetch';
import { rename, unlink } from 'fs/promises';

const p = (path) => new URL(path, import.meta.url);

class DownloadHandler extends Handler {
  constructor(name, browser) {
    super(name, browser);
    this.jobsTubeName = 'download-crawler-otakudesu';
    this.jobsTube = new Beanstalk(this.jobsTubeName);
    this.pararelCount = 5;
    this.sourceHeader = JSON.parse(readFileSync(p('./source-headers.json')));
    console.log(this.sourceHeader);
  }

  /**
   * @param {import('puppeteer').Page} page 
   * @param {string} job 
   */
  async main(page, job) {
    console.log(job);
    const res = await fetch(job.url, this.sourceHeader);
    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    const wrStream = createWriteStream(p(`../../data_test/${job.filename}.tmp`));
    console.log(`Start download [${job.filename}]`);
    await new Promise((resolve, reject) => {
      res.body.pipe(wrStream).on('finish', async () => {
        await rename(p(`../../data_test/${job.filename}.tmp`), p(`../../data_test/${job.filename}`));
        resolve();
      }).once('error', async (err) => {
        await unlink(p(`../../data_test/${job.filename}.tmp`));
        reject(err);
      });
    });
    console.log(`download [${job.filename}]: Done.`);
  }
};

export default DownloadHandler;
