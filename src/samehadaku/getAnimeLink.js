import axios from 'axios';
import { JSDOM } from 'jsdom';
import map from '../library/map.js';

async function* getAnimeLink() {
  let pageNum = 1;
  while (pageNum <= 100) {
    const animePageUrl = 'https://samehadaku.world/daftar-anime-2/page/$/?order=latest&status=Currently%20Airing&type'.replace('$', pageNum);

    const res = (await axios.get(animePageUrl)).data;
    const { window } = new JSDOM(res);
    const document = window.document;

    const links = map((a) => a?.href, document.querySelectorAll('.relat .animposx a'));
    if (!links.length) {
      return;
    }
    yield links;
    pageNum += 1;
  }
};

export default getAnimeLink;
