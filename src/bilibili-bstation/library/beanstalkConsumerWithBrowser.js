import Beanstalk from './beanstalk.js';

export const defaultBrowserOpt = { headless: false, args: ['--no-sandbox', '--mute-audio'], executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' };
const BeanstalkConsumerWithBrowser = async (tubename, callbackfn, args = [], browserOpt = defaultBrowserOpt, calledJob = null) => {
  let browser = await (await import('puppeteer')).launch(browserOpt);
  const tube = new Beanstalk(tubename);
  let job = calledJob || (await tube.put());
  try {
    while (job) {
      await callbackfn(browser, job, ...args);
      job = await tube.put();
    }
  } catch (err) {
    console.log('working error', err);
  }

  console.log(`[${tubename}]:` + ' now  job is null, starting use interval');
  await browser.close();
  browser = null;

  const interval = setInterval(async () => {
    const job = await tube.put();
    if (job) {
      clearInterval(interval);
      BeanstalkConsumerWithBrowser(tubename, callbackfn, args, browserOpt, job);
      callbackfn = null;
    }
  }, 5000);
};

export default BeanstalkConsumerWithBrowser;
