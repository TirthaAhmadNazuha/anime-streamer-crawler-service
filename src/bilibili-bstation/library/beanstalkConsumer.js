import Beanstalk from './beanstalk.js';

const BeanstalkConsumer = async (tubename, callbackfn, args = [], calledJob = null) => {
  const tube = new Beanstalk(tubename);
  let job = calledJob || (await tube.put());
  while (job) {
    try {
      console.log(job);
      await callbackfn(job, ...args);
    } catch (err) {
      console.log('working error', err);
    }
    job = await tube.put();
  }

  console.log(`[${tubename}]:` + ' now job is null, starting use interval');

  const interval = setInterval(async () => {
    const job = await tube.put();
    if (job) {
      clearInterval(interval);
      BeanstalkConsumer(tubename, callbackfn, args, job);
      callbackfn = null;
    }
  }, 5000);
};

export default BeanstalkConsumer;
