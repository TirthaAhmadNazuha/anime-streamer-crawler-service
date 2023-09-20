import { createWriteStream } from 'fs';
import fetch from 'node-fetch';
import { pipeline } from 'stream/promises';

const downloadSource = async (souceDl) => {
  try {
    const res = await fetch(souceDl.src);
    const directory = 'E:/data-crawling/videos/';
    const writeStream = createWriteStream(directory + souceDl.name);
    const start = Date.now();
    console.log('start');
    await pipeline(res.body, writeStream);
    console.log(`done at ${Date.now() - start}ms`);
  } catch (error) {
    console.error(error);
  }
};

export default downloadSource;
