import { config } from 'dotenv';
config();
import SourceWorker from './SourceWorker.js';
import getAndSaveResponseFromRequrement from './DownloadWorker.js';
import BeanstalkConsumer from '../../library/beanstalkConsumer.js';
import BeanstalkConsumerWithBrowser from '../../library/beanstalkConsumerWithBrowser.js';

const Settings = {
  donwloadWorkerTubeName: 'bilibili-bstation-request-object',
  sourceWorkerTubeName: 'bilibili-bstation-anime-get-source-id'
};

async function main() {
  BeanstalkConsumerWithBrowser(Settings.sourceWorkerTubeName, SourceWorker, [Settings.donwloadWorkerTubeName, { episodes: ['E3', 'E4'] }]);
  BeanstalkConsumer(Settings.donwloadWorkerTubeName, getAndSaveResponseFromRequrement);
}
main().then(() => {
  console.log('Settup done');
});
