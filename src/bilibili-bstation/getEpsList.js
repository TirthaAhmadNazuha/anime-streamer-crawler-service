import { abortAllRequest } from '../library/optPuppeteer.js';
import logger from './utilities/logger.js';

/**
 * @param {(import('puppeteer').Browser)} browser 
 */
const getEpsList = async (browser, animeBstationId) => {
  const page = await browser.newPage();
  try {
    await page.goto(`https://www.bilibili.tv/id/play/${animeBstationId}`);

    await abortAllRequest(page);

    // getting metadata
    const metadata = await page.evaluate(async () => {
      try {
        const result = Array.from(document.querySelectorAll('.ep-list > a'))
          .map((a) => {
            return { url: a.href.split('?')[0], text: a.textContent, title: a.getAttribute('title') };
          });

        return {
          ok: true,
          message: 'Success',
          result
        };
      } catch (err) {
        return { ok: false, message: err.message };
      }
    });
    await page.close();
    return metadata;
  } catch (err) {
    await page.close();
    logger(err);
  }
};

export default getEpsList;
