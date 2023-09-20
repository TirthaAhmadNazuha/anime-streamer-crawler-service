import axios from 'axios';
import { JSDOM } from 'jsdom';
import map from '../library/map.js';

const getEpsDetail = async (animeLink) => {
  try {
    const html = (await axios.get(animeLink)).data;
    const { window } = new JSDOM(html);
    const document = window.document;
    const detail = new Promise((resolve) => {
      const detail = {
        desc: document.querySelector('div.desc').textContent.trim(),
        gendre: map((a) => a.textContent, document.querySelectorAll('div.genre-info a')),
      };
      const ontablechilds = document.querySelectorAll('.infoanime .spe > span');
      ontablechilds.forEach((span) => {
        const key = span.children[0].textContent;
        const value = span.textContent.replace(key, '').trim();
        detail[key.replace(':', '').toLowerCase()] = value;
      });
      resolve(detail);
    });
    const metadata = {
      url: animeLink,
      title: document.querySelector('h1.entry-title').textContent.replace('Nonton Anime', '').trim(),
      coverImg: document.querySelector('.thumb img').src,
    };
    const epsLink = map((a) => a.href, document.querySelectorAll('.lstepsiode > ul li div:first-of-type span > a'));

    metadata.detail = await detail;
    return { metadata, epsLink };
  } catch (err) {
    console.error(err);
  }
};

export default getEpsDetail;
