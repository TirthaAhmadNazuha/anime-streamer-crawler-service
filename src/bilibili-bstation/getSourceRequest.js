import loadCookie from '../library/loadCookie.js';
import logger from './utilities/logger.js';

/**
 * @param {(import('puppeteer').Browser)} browser 
 * @returns {Promise<{ episode: string, video: Object, audio: Object, subtitles: Object }[]>}
 */
const getSourceRequest = async (browser, animeBstationId) => {
  const page = await browser.newPage();
  try {
    const cookies = loadCookie(new URL('./user-cookie.txt', import.meta.url), '.bilibili.tv');
    await page.setCookie(...cookies);
    const epsUrl = `https://www.bilibili.tv/id/play/${animeBstationId}`;
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
          headers: req.headers(),
          ext: 'txt'
        };
      } else if (url.startsWith('https://upos-bstar1-mirrorakam.akamaized.net/iupxcodeboss/')) {
        if (!requirement[epsKey].video) {
          const headers = req.headers();
          delete headers['range'];
          requirement[epsKey].video = {
            url,
            method: req.method(),
            headers,
            ext: 'mp4'
          };
        } else if (!requirement[epsKey].audio) {
          const headers = req.headers();
          delete headers['range'];
          requirement[epsKey].audio = {
            url,
            method: req.method(),
            headers,
            ext: 'mp3'
          };
        }
      }
      await req.continue();
    });

    let anchorWillClick = await page.waitForSelector('.ep-list a:first-child');
    await anchorWillClick.click();
    epsKey = (await anchorWillClick?.getProperty('textContent')).toString().split(':')[1] || 'E0';
    while (anchorWillClick != null) {
      await new Promise((resolve) => {
        const timeOut = setTimeout(() => {
          resolve();
          clearInterval(interval);
          clearTimeout(timeOut);
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
      await anchorWillClick.click();
      anchorWillClick = await page.$('.ep-list .ep-item--active + a');
      if (anchorWillClick) {
        epsKey = (await anchorWillClick.getProperty('textContent')).toString().split(':')[1];
      }
    }
    await page.close();
    return await new Promise((resolve) => {
      const result = [];
      Object.keys(requirement).forEach((epsKey) => {
        result.push({
          episode: epsKey,
          ...requirement[epsKey]
        });
      });
      resolve(result);
    });
  } catch (err) {
    await page.close();
    logger(err);
  }
};

// (async () => {
//   try {
//     const browser = await (await import('puppeteer')).launch({
//       headless: false,
//       args: [
//         '--no-sandbox',
//       ],
//       executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
//     });
//     const result = await getSourceRequest(browser, 'https://www.bilibili.tv/id/play/2084136/12842293');
//     logger(result);
//     await browser.close();
//   } catch (error) {
//     console.error(error);
//   }
// })().then(() => logger('working done.'));

export default getSourceRequest;
