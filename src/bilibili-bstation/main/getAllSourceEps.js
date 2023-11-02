import fetch from 'node-fetch';
import { defaultBrowserOpt } from '../library/beanstalkConsumerWithBrowser.js';
import loadCookie from '../library/loadCookie.js';
import { writeFile, readFile } from 'fs/promises';
import { createWriteStream } from 'fs';

/**
 * @param {(import('puppeteer').Browser)} browser
 * @param {string | number} animeBstationIdOEpsLink
 * @param {string} dowloaderTubeName,
 * @param {{episodes: 'all' | string[]}} option
 */
const GetAllSourceEps = async (browser, animeBstationIdOEpsLink) => {
  const page = await browser.newPage();
  try {
    const cookies = loadCookie(new URL('../user-cookie.txt', import.meta.url), '.bilibili.tv');
    await page.setCookie(...cookies);
    const epsUrl = typeof animeBstationIdOEpsLink == 'number' ? `https://www.bilibili.tv/id/play/${animeBstationIdOEpsLink}` : animeBstationIdOEpsLink;
    await page.goto(epsUrl);


    await page.setRequestInterception(true);
    let akamaizedHeaders = null;
    const dataGateway = [];
    page.on('request', async (req) => {
      if (req.resourceType() == 'image') {
        await req.abort();
        return;
      }
      const url = req.url();
      if (url.startsWith('https://upos-bstar1-mirrorakam.akamaized.net/iupxcodeboss/')) {
        const headers = req.headers();
        delete headers['range'];
        akamaizedHeaders = { headers, method: req.method() };
      } else if (url.startsWith('https://api.bilibili.tv/intl/gateway/')) {
        if (req.response()) {
          dataGateway.push(await req.response().json());
        } else {
          const res = await fetch(url, {
            method: req.method(),
            headers: req.headers()
          });
          console.log('with fetch');
          dataGateway.push(await res.json());
        }
      }
      await req.continue();
    });

    await new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (akamaizedHeaders != null && dataGateway.find((gate) => gate.data?.playurl)) {
          resolve();
          clearInterval(interval);
          clearTimeout(timeOut);
        }
      }, 50);
      const timeOut = setTimeout(() => {
        console.log('abort');
        reject('try again');
        clearTimeout(timeOut);
        clearInterval(interval);
      }, 5000);
    });

    console.log('write');
    const resultGateway = {};
    dataGateway.forEach((gate) => {
      if (gate.data?.playurl) {
        resultGateway.video = gate.data.playurl?.video?.map((video) => video.video_resource.url) || null;
      } else if (gate.data?.subtitles) {
        resultGateway.subtitles = gate.data.subtitles[0];
      }
    });
    await writeFile(new URL('./data_test.json', import.meta.url), JSON.stringify({ akamaizedHeaders, resultGateway }, undefined, 4));
    await page.close();
    return true;
  } catch (err) {
    await page.close();
    console.log(err);
    return false;
  }
};


(async () => {
  // const browser = await (await import('puppeteer')).launch(defaultBrowserOpt);
  // let getSourceSuccess = await GetAllSourceEps(browser, 'https://www.bilibili.tv/id/play/34638/342358');
  // let hasTryCount = 0;
  // while (getSourceSuccess == false && hasTryCount <= 3) {
  //   console.log('success :', getSourceSuccess, 'now is tryCount: ', hasTryCount);
  //   hasTryCount += 1;
  //   if (getSourceSuccess) hasTryCount = 5;
  //   getSourceSuccess = await GetAllSourceEps(browser, 'https://www.bilibili.tv/id/play/34638/342358');
  // }
  // console.log('done.');

  // await browser.close();
  console.log('downloading');
  const dataDownload = JSON.parse((await readFile(new URL('./data_test.json', import.meta.url), 'utf-8')));
  const { akamaizedHeaders, resultGateway } = dataDownload;
  const download = async (url) => {
    if (url === '') {
      console.log('url is null');
      return;
    }
    const filename = `../../../data_test/anime_${url.split('-').pop().split('.')[0]}.mp4`;
    const writeStream = createWriteStream(new URL(filename, import.meta.url));
    const res = await fetch(url, akamaizedHeaders);
    if (res.ok) {
      console.log(`start download: ${filename}`);
      console.log('\n\n');
      const contentLength = parseInt(res.headers.get('Content-Length'));
      const interval = setInterval(() => {
        console.clear();
        console.log(`download: ${filename} progress: ${Math.floor((writeStream.bytesWritten / contentLength) * 100)}%`);
      }, 2000);
      await new Promise((resolve) => {
        res.body.pipe(writeStream).on('finish', () => {
          resolve(true);
          clearInterval(interval);
        });
      });
    } else console.log(`download ${filename} response not ok`);
  };

  await Promise.all(resultGateway.video.map((url) => download(url)));
})();
