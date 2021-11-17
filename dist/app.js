"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
const mysql_1 = __importDefault(require("mysql"));
const url = 'https://www.lawson.co.jp/recommend/new/';
const target = '.heightLineParent > li';
(async () => {
    const browser = await puppeteer_1.default.launch();
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForNavigation();
    const lists = await page.$$eval(target, (datas) => {
        const lists = [];
        datas.forEach((data) => {
            const list = {
                href: data.querySelector('a')?.href,
                img: data.querySelector('img')?.src,
                title: data.querySelector('.ttl')?.textContent,
                kcal: data.querySelector('.ttl')?.nextElementSibling
                    ?.textContent,
                price: data.querySelector('.price')?.textContent,
                date: data.querySelector('.date > span')?.textContent,
                caution: data.querySelector('.smalltxt')?.textContent || '',
            };
            lists.push(list);
        });
        return lists;
    });
    console.log(lists);
    const connection = mysql_1.default.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Toeic900',
        database: 'list_app',
    });
    connection.connect((err) => {
        if (err) {
            console.log('error connecting:' + err.stack);
            return;
        }
        console.log('success');
    });
    lists.forEach((list) => {
        connection.query(`INSERT INTO users (href, img, title, kcal, price, date, caution) VALUES 
      ('${list.href}', '${list.img}', '${list.title}', '${list.kcal}', '${list.price}', '${list.date}', '${list.caution}')`, (error, results) => {
            if (error)
                throw error;
            console.log(results);
        });
    });
    connection.end();
    browser.close();
})();
