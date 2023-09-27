import { createWriteStream, existsSync } from 'fs';
import { mkdir, rename } from 'fs/promises';
import fetch from 'node-fetch';
import { config } from 'dotenv';
config();

// const p = (path) => new URL(path, import.meta.url);

// const root = process.env.DIR_ANIME_OUTPUT;
const root = 'F:/work_files/big-web-crawler/crawler-service/data_test/';
/**
 * @typedef {{ url: string, headers: Object<string>, ext: string, method: string }} ObjetReq
 
 * @param {ObjetReq} objetReq 
 */
const getRes = async (objetReq) => {
  return await fetch(objetReq.url, { method: objetReq?.method || 'GET', headers: objetReq.headers });
};

/**
 * 
 * @param {Response} response 
 * @param {WritableStream} writeStream 
 */
export const pipeline = (response, writeStream) => {
  response.body.pipe(writeStream);
  return new Promise((resolve) => {
    writeStream.on('finish', resolve);
  });
};

/**
 * @param {{ video: ObjetReq, audio: ObjetReq, subtitles: ObjetReq, path: string }} requirement 
 */
const getAndSaveResponseFromRequrement = async (requirement) => {
  const path = requirement?.path;
  if (typeof requirement?.video?.url !== 'string') {
    console.log('requirement argument not valid.', requirement, requirement?.video?.url);
    return;
  }
  try {
    if (existsSync(root + path + '.mp4')) {
      console.log(`job.path: ${path} already exist`);
      return;
    }
    const [video, audio, subtitles] = await Promise.all([
      getRes(requirement.video),
      getRes(requirement.audio),
      getRes(requirement?.subtitles),
    ]);
    if (!existsSync(root + path.split('/')[0])) {
      console.log('creating dir');
      await mkdir(root + path.split('/')[0]);
    }
    const writeStream = {
      video: createWriteStream(`${root}${path}.mp4.tmp`),
      audio: createWriteStream(`${root}${path}.mp3.tmp`),
      subtitles: createWriteStream(`${root}${path}.${subtitles.headers.get('Content-Type').split('/')[1] || '.acfs'}`)
    };
    await Promise.all([
      pipeline(video, writeStream.video),
      pipeline(audio, writeStream.audio),
      pipeline(subtitles, writeStream.subtitles),
    ]);

    await Promise.all([
      rename(`${root}${path}.mp4.tmp`, `${root}${path}.mp4`),
      rename(`${root}${path}.mp3.tmp`, `${root}${path}.mp3`),
    ]);

    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export default getAndSaveResponseFromRequrement;

