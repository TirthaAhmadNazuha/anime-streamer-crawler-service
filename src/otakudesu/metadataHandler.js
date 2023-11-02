import Beanstalk from '../library/beanstalk.js';
import Handler from './handler.js';

class MetadataHandler extends Handler {
  constructor(name, browser) {
    super(name, browser);
    this.jobsTubeName = 'meta-crawler-otakudesu';
    this.jobsTube = new Beanstalk(this.jobsTubeName);
    this.sourceTubeName = 'source-crawler-otakudesu';
    this.sourceTube = new Beanstalk(this.sourceTubeName);

    this.pararelCount = 3;
  }

  /**
   * @param {import('puppeteer').Page} page 
   * @param {string | object | number} job 
   */
  async main(page, job) {
    await page.goto(job);
    const [metadata, episodes] = await page.evaluate(() => {
      const meta = {};
      document.querySelectorAll('.infozingle p span').forEach((span) => {
        const key = span.children[0].textContent;
        meta[key] = span.textContent.replace(`${key}: `, '');
      });
      const eps = [];
      document.querySelectorAll('.episodelist ul > li > span > a').forEach((anchor) => {
        eps.push({
          url: anchor.href,
          title: anchor.textContent,
        });
      });

      return [meta, eps.reverse()];
    });

    await this.sourceTube.body(...episodes.map((eps) => eps.url));

    console.log(metadata, episodes);
  }
}


export default MetadataHandler

