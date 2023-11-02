import Beanstalk from '../library/beanstalk.js';
import { defaultBrowserOpt } from '../library/beanstalkConsumerWithBrowser.js';

class Handler {
  /** @param {import('puppeteer').Browser} browser */
  constructor(name, browser) {
    this.name = name;
    this.browser = browser;
    this.running = false;
    this.nowJob = null;
  }

  /** @returns {Promise<import('puppeteer').Page>} */
  async newPage() {
    if (!this.browser) return null;
    const pageNew = await this.browser.newPage();
    await pageNew.setRequestInterception(true);
    const abortRequestTypes = ['image', 'font', 'stylesheet', 'other'];
    pageNew.on('request', async (req) => {
      const resourceType = req.resourceType();
      if (abortRequestTypes.find((type) => type == resourceType)) {
        await req.abort();
        return;
      }
      await req.continue();
    });
    return pageNew;
  }

  async run(calledJob = null) {
    /** @type {string[]} */
    let jobs = calledJob || (await this.jobsTube.put(this.pararelCount));
    const workOne = async (job) => {
      const page = await this.newPage();
      try {
        await this.main(page, job);
        await page.close();
      } catch (err) {
        await page.close();
      }
    };
    this.running = true;
    while (jobs && this.running === true) {
      this.nowJob = jobs;
      try {
        await Promise.all(jobs.map(workOne));
        jobs = await this.jobsTube.put(this.pararelCount);
      } catch (err) {
        jobs = await this.jobsTube.put(this.pararelCount);
        console.log(`[${this.name}] ERROR = `, err);
      }
    }
    jobs = null;
    this.running = false;
    this.waitingJobsInterval = setInterval(async () => {
      const calledJob = await this.jobsTube.put(this.pararelCount);
      if (calledJob) {
        clearInterval(this.waitingJobsInterval);
        console.log(`[${this.name}] INFO = "Get new job in waiting interval"`);
        this.run(calledJob);
      }
    }, 5000);
  }

  stop() {
    this.running = false;
    clearInterval(this.waitingJobsInterval);
  }

  /**
   * 
   * @param {import('puppeteer').Page} page 
   * @param {string} job 
   */
  async main(page, job) {
    throw new Error(`[${this.name}]: method main not implements`);
  }
}


export default Handler

