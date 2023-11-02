import Beanstalk from '../library/beanstalk.js';
import Handler from './handler.js';
// import { writeFile } from 'fs/promises';

const sleep = (duration) => new Promise((r) => setTimeout(r, duration));
const p = (path) => new URL(path, import.meta.url);

class SourceHandler extends Handler {
  constructor(name, browser) {
    super(name, browser);
    this.jobsTubeName = 'source-crawler-otakudesu';
    this.jobsTube = new Beanstalk(this.jobsTubeName);
    this.downloadTubeName = 'download-crawler-otakudesu';
    this.downloadTube = new Beanstalk(this.downloadTubeName);
    this.pararelCount = 3;
  }

  /**
   * @param {import('puppeteer').Page} page 
   * @param {string} job 
   */
  async main(page, job) {
    await page.goto(job);

    const minorAchorStatus = await page.evaluate(() => {
      const nameAchors = [
        'ondesuhd ',
        'odstream ',
      ];
      const minorAnchor = document.querySelectorAll('.mirrorstream .m720p a');
      let status = 'fail';
      minorAnchor.forEach((a) => {
        if (nameAchors.find((name) => name === a.textContent)) {
          a.click();
          status = 'success';
          return;
        }
      });
      return status;
    });
    console.log('minorAchorStatus: ', minorAchorStatus);
    const iframePlayerUrl = (await (await page.$('#pembed iframe')).getProperty('src')).toString().replace('JSHandle:', '');
    const playerPage = await page.browser().newPage();
    // let updatedHeaders = false;
    await playerPage.goto(iframePlayerUrl);
    // await playerPage.setRequestInterception(true);
    // playerPage.on('request', async (req) => {
    //   const url = req.url();
    //   if (url.includes('.googlevideo.com/videoplayback')) {
    //     writeFile(p('./source-headers.json'), JSON.stringify({ headers: req.headers() }));
    //     updatedHeaders = true;
    //   }
    // });
    await playerPage.bringToFront();
    await (await playerPage.$('.close-button'))?.click();
    await sleep(300);
    const videoTag = await playerPage.$('video');
    await videoTag?.click();
    const sourceURL = (await videoTag.getProperty('src')).toString().replace('JSHandle:', '');

    await playerPage.close();
    (await page.browser().pages()).forEach(async (tab) => {
      const url = tab.url();
      try {
        if (url.startsWith('https://qq')) await tab.close(true);
      } catch (_) { }
    });
    console.log(`source url [${job}]: ${sourceURL}`);

    // await new Promise((resolve) => {
    //   if (updatedHeaders) {
    //     resolve();
    //   } else {
    //     setTimeout(resolve, 2000);
    //   }
    // });

    await this.downloadTube.body({ url: sourceURL, filename: job.split('/').pop() });
    console.log('done.');
  }
}

export default SourceHandler;
