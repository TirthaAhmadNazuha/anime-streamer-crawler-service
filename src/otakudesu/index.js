import DownloadHandler from './downloadHandler.js';
import MetadataHandler from './metadataHandler.js';
import SourceHandler from './sourceHandler.js';

const defaultBrowserOpt = { headless: false, args: ['--no-sandbox', '--mute-audio'], executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' };
async function main() {
  const browser = await (await import('puppeteer')).launch(defaultBrowserOpt);
  try {
    // const metadataHandler = new MetadataHandler('Test MetadataHandler', browser);
    const sourceHandler = new SourceHandler('Test SourceHandler', browser);
    const downloadHandler = new DownloadHandler('Test DownloadHandler');
    console.log('start...');
    // await metadataHandler.run();
    await sourceHandler.run();
    await downloadHandler.run();
    console.log('runned');
  } catch (err) {
    console.error(err);
    await browser.close();
    process.exit();
  }
}

main();
