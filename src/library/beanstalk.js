import { config } from 'dotenv';
config();
import axios from 'axios';

const Beanstalk = class {
  constructor(tubename) {
    this.origin = process.env.BEANSTALK_SERVICE;
    this.url = `${this.origin}tubes/${tubename}`;
  }

  async put(size = 0) {
    if (size > 0) {
      const job = (await axios.get(this.url + `?size=${size}`)).data;
      return job;
    } else {
      const job = (await axios.get(this.url)).data;
      return job != 'null' ? job : null;
    }
  }

  async body(...job) {
    await axios.post(this.url + '?spreading=1', job);
  }
};

export default Beanstalk;
