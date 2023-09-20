import { createWriteStream, existsSync } from 'fs';
import { mkdir, rename, writeFile } from 'fs/promises';
import fetch from 'node-fetch';
import { config } from 'dotenv';
config();
import logger from './utilities/logger.js';

// const p = (path) => new URL(path, import.meta.url);

const root = process.env.DIR_ANIME_OUTPUT;
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
 * @param {{ video: ObjetReq, audio: ObjetReq, subtitles: ObjetReq }} requirement 
 * @param {string} path
 */
const getAndSaveResponseFromRequrement = async (requirement, path) => {
  try {
    if (existsSync(root + path + requirement.video.ext)) {
      logger(`job.path: ${path} already exist`);
      return;
    }
    const [video, audio, subtitles] = await Promise.all([
      getRes(requirement.video),
      getRes(requirement.audio),
      getRes(requirement?.subtitles),
    ]);
    if (!existsSync(root + path.split('/')[0])) {
      logger('creating dir');
      await mkdir(root + path.split('/')[0]);
    }
    const writeStream = {
      video: createWriteStream(`${root}${path}.${requirement.video.ext}.tmp`),
      audio: createWriteStream(`${root}${path}.${requirement.audio.ext}.tmp`),
    };
    await Promise.all([
      pipeline(video, writeStream.video),
      pipeline(audio, writeStream.audio),
      (async () => {
        if (subtitles.ok) {
          logger('subtitles ok');
          const lines = (await subtitles.text()).split('\n');
          const resultLines = ['Start, End, class, Text'];
          lines.forEach((line) => {
            if (line.startsWith('Dialogue: ')) {
              const [Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, ...Text] = line.split(',');
              if (Style == 'dialog') {
                resultLines.push(['0' + Start, '0' + End, Style.toLowerCase().replace(' ', '-'), Text.join(',').replace(/\r\n|\r|\n/g, '\\N')].join(','));
              } else {
                const text = [];
                let braketOp = false;
                let braketEd = false;
                Array.from(Text.join(',').replace(/\r\n|\r|\n/g, '\\N')).forEach((char) => {
                  if (char == '{') {
                    braketOp = true;
                    braketEd = false;
                    return;
                  }
                  if (char == '}') {
                    braketEd = true;
                    braketOp = false;
                    return;
                  }

                  if (!braketOp && braketEd) {
                    text.push(char);
                  }
                });
                resultLines.push(['0' + Start, '0' + End, Style.toLowerCase().replaceAll(' ', '-'), text.join('')].join(','));
              }
            }
          });
          await writeFile(`${root}${path}.acfs`, resultLines.join('\n'));
        }
      })()
    ]);

    await Promise.all([
      rename(`${root}${path}.${requirement.video.ext}.tmp`, `${root}${path}.${requirement.video.ext}`),
      rename(`${root}${path}.${requirement.audio.ext}.tmp`, `${root}${path}.${requirement.audio.ext}`),
    ]);

    return true;
  } catch (err) {
    logger(err);
    return false;
  }
};

export default getAndSaveResponseFromRequrement;
