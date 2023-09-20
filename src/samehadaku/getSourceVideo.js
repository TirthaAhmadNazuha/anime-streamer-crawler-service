// samehadaku.world for Wibufile
import axios from 'axios';
import { JSDOM } from 'jsdom';


export const getURLDl = async (epsUrl) => {
  const res = await axios.get(epsUrl);
  if (res.status != 200) return false;
  const { window } = new JSDOM(res);
  const document = window.document;
  const anchor = document.querySelector('div.download-eps:nth-of-type(2) ul li:nth-of-type(4) span > a')?.href;
  console.log(anchor);
  const splitedLink = document.querySelector('div.download-eps:nth-of-type(2) ul li:nth-of-type(4) span > a')?.href.split('/');
  if (splitedLink == undefined) return false;
  return 'https://wibufile.com/embed/' + splitedLink[splitedLink.length - 2];
};

export const getSourceDl = async (urlDl) => {
  if (urlDl === false) return false;
  const res = await axios.get(urlDl);
  if (res.status != 200) return false;
  const datasource = res.split('player.source = {')[1].split('};')[0];
  return {
    name: datasource.split('title: "')[1].split('",')[0],
    src: datasource.split('src: "')[1].split('",')[0]
  };
};
