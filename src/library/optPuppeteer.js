export const abortAllRequest = async (page) => {
  await page.setRequestInterception(true);

  page.on('request', async (req) => {
    await req.abort();
  });
};
