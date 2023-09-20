import loadCookie from '../library/loadCookie.js';
import logger from './utilities/logger.js';

/**
 * @param {(import('puppeteer').Browser)} browser 
 */
const getOneEpsSourceRequest = async (browser, epsUrl) => {
  const page = await browser.newPage();
  try {
    const cookies = loadCookie(new URL('./user-cookie.txt', import.meta.url), '.bilibili.tv');
    await page.setCookie(...cookies);
    await page.goto(epsUrl);
    await page.setRequestInterception(true);

    const requirement = {};

    page.on('request', async (req) => {
      if (req.resourceType() == 'image') {
        await req.abort();
        return;
      }
      const url = req.url();
      if (url.startsWith('https://s.bstarstatic.com/ogv/subtitle/') && !requirement.subtitles) {
        requirement.subtitles = {
          url,
          method: req.method(),
          headers: req.headers(),
          ext: 'txt'
        };
      } else if (url.startsWith('https://upos-bstar1-mirrorakam.akamaized.net/iupxcodeboss/')) {
        if (!requirement.video) {
          const headers = req.headers();
          delete headers['range'];
          logger(headers);
          requirement.video = {
            url,
            method: req.method(),
            headers,
            ext: 'mp4'
          };
        } else if (!requirement.audio) {
          const headers = req.headers();
          delete headers['range'];
          logger(headers);
          requirement.audio = {
            url,
            method: req.method(),
            headers,
            ext: 'mp3'
          };
        }
      }
      await req.continue();
    });

    await page.setMute(true);
    const episode = (await (await page.$('.ep-list .ep-item--active')).getProperty('textContent')).toString().split(':')[1];
    await new Promise((resolve) => {
      const timeOut = setTimeout(() => {
        resolve();
        clearInterval(interval);
        clearTimeout(timeOut);
      }, 20000);
      const interval = setInterval(() => {
        if (requirement.video && requirement.audio && requirement.subtitles) {
          resolve();
          clearInterval(interval);
          clearTimeout(timeOut);
        }
      }, 50);
    });
    requirement.episode = episode;
    return requirement;

  } catch (err) {
    await page.close();
    logger(err);
  }
};

export default getOneEpsSourceRequest;


// (async () => {
//   try {
//     const browser = await (await import('puppeteer')).launch({
//       headless: false,
//       args: [
//         '--no-sandbox',
//       ],
//       executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
//     });
//     const result = await getOneEpsSourceRequest(browser, 'https://www.bilibili.tv/id/play/2084136/12841935');
//     logger(result);
//     await browser.close();
//   } catch (error) {
//     console.error(error);
//     await browser.close();
//   }
// })().then(() => logger('working done.'));
