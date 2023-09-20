import { appendFileSync } from 'fs';

const logger = (message) => {
  try {
    console.log(message);
    appendFileSync(new URL('../message.log', import.meta.url), JSON.stringify(message) + '\n');
  } catch (_) { }
};


export default logger;
