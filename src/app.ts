import puppeteer from 'puppeteer'
const url = 'https://www.lawson.co.jp/recommend/new/'
const target = '.heightLineParent > li';

(async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto(url)
  await page.waitForNavigation();
  const links = await page.$$eval(target, links => {
    console.log(links)
    console.log('----------------------')
    return links.map(link => link.outerHTML);
  });
  await browser.close();
})()