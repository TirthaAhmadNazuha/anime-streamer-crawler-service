import { abortAllRequest } from '../library/optPuppeteer.js';
import logger from './utilities/logger.js';

/**
 * @param {(import('puppeteer').Browser)} browser 
 */
const getMetaDataAnime = async (browser, animeBstationId) => {
  const page = await browser.newPage();
  try {
    await page.goto(`https://www.bilibili.tv/id/media/${animeBstationId}`);

    await abortAllRequest(page);

    // getting metadata
    const metadata = await page.evaluate(async () => {
      try {
        const section = document.querySelector('.media-info');
        const result = {
          title: section.querySelector('h1').textContent,
          tags: Array.from(section.querySelectorAll('.detail-table__tags a')).map((a) => a.textContent),
          coverImage: section.querySelector('.media-info__cover img').src,
          detail: {
            desc: section.querySelector('.detail-operate__desc > p').textContent,
            info: null
          }
        };

        await new Promise((resolve) => {
          const r = {};
          section.querySelectorAll('.detail-table label').forEach((label) => {
            if (label.textContent == 'Genre') {
              r['Genre'] = Array.from(label.nextElementSibling.querySelectorAll('a')).map((a) => a.textContent);
            } else r[label.textContent] = label.nextElementSibling?.textContent || null;
          });
          result.detail.info = JSON.stringify(r);

          setTimeout(() => {
            resolve();
          }, 10);
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
    metadata.result.sourceId = animeBstationId;
    await page.close();
    return metadata;
  } catch (err) {
    await page.close();
    logger(err);
  }
};


export default getMetaDataAnime;

// (async () => {
//   const browser = await launch({
//     headless: true,
//     args: [
//       '--no-sandbox',
//     ],
//     executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
//   });

//   const animeIds = [
//     '2084136',
//     '2083386',
//     '2083663',
//     '2084600',
//   ];

//   for (const animeBstationId of animeIds) {
//     await getMetaDataAnime(browser, animeBstationId);
//   };

//   await browser.close();
// })()
//   .then(() => logger('done'))
//   .catch((err) => console.error(err));
