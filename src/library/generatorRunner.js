import logger from '../bilibili-bstation/utilities/logger.js';

const generatorRunner = async (generator, name) => {
  for await (const value of generator()) {
    logger(name, value);
  }
};

export default generatorRunner;
