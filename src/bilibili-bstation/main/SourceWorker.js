import Beanstalk from '../library/beanstalk.js';
import loadCookie from '../../library/loadCookie.js';
import logger from '../utilities/logger.js';

/**
 * @param {(import('puppeteer').Browser)} browser
 * @param {string | number} animeBstationIdOEpsLink
 */
const SourceWorker = async (browser, animeBstationIdOEpsLink, dowloaderTubeName) => {
  const page = await browser.newPage();
  try {
    const cookies = loadCookie(new URL('../user-cookie.txt', import.meta.url), '.bilibili.tv');
    await page.setCookie(...cookies);
    const epsUrl = typeof animeBstationIdOEpsLink == 'number' ? `https://www.bilibili.tv/id/play/${animeBstationIdOEpsLink}` : animeBstationIdOEpsLink;
    await page.goto(epsUrl);


    await page.setRequestInterception(true);
    const requirement = {};
    let epsKey = 'E0';

    page.on('request', async (req) => {
      if (req.resourceType() == 'image') {
        await req.abort();
        return;
      }
      const url = req.url();
      if (requirement[epsKey] == undefined) requirement[epsKey] = {};
      if (url.startsWith('https://s.bstarstatic.com/ogv/subtitle/') && !requirement[epsKey].subtitles) {
        requirement[epsKey].subtitles = {
          url,
          method: req.method(),
          headers: req.headers()
        };
      } else if (url.startsWith('https://upos-bstar1-mirrorakam.akamaized.net/iupxcodeboss/')) {
        if (!requirement[epsKey].video) {
          const headers = req.headers();
          delete headers['range'];
          requirement[epsKey].video = {
            url,
            method: req.method(),
            headers,
          };
        } else if (!requirement[epsKey].audio) {
          const headers = req.headers();
          delete headers['range'];
          requirement[epsKey].audio = {
            url,
            method: req.method(),
            headers,
          };
        }
      }
      await req.continue();
    });
    const dowloaderTube = new Beanstalk(dowloaderTubeName);

    let anchorWillClick = await page.waitForSelector('.ep-list a:first-child');
    await anchorWillClick.click();
    epsKey = (await anchorWillClick?.getProperty('textContent')).toString().split(':')[1] || 'E0';
    let premiumSource = false;
    while (anchorWillClick != null || premiumSource == true) {
      await new Promise((resolve) => {
        const timeOut = setTimeout(() => {
          resolve();
          clearInterval(interval);
          clearTimeout(timeOut);
          premiumSource = true;
        }, 20000);
        const interval = setInterval(() => {
          const r = requirement[epsKey];
          if (r?.video && r?.audio && r?.subtitles) {
            resolve();
            clearInterval(interval);
            clearTimeout(timeOut);
          }
        }, 50);
      });
      const putJob = requirement[epsKey];
      if (putJob) {
        putJob.path = `anime_${animeBstationIdOEpsLink}/${epsKey}`;
        console.log('putJob', putJob);
        await dowloaderTube.body(putJob);
        delete requirement[epsKey];
        await anchorWillClick.click();
        anchorWillClick = await page.$('.ep-list .ep-item--active + a');
        if (anchorWillClick) {
          epsKey = (await anchorWillClick.getProperty('textContent')).toString().split(':')[1];
        }
      }
    }
    await page.close();
  } catch (err) {
    await page.close();
    logger(err);
  }
};


export default SourceWorker;
