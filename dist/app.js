"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
const url = 'https://www.lawson.co.jp/recommend/new/';
const target = '.heightLineParent > li';
(async () => {
    const browser = await puppeteer_1.default.launch();
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForNavigation();
    const links = await page.$$eval(target, links => {
        console.log(links);
        console.log('----------------------');
        return links.map(link => link.outerHTML);
    });
    await browser.close();
})();
