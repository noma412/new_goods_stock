"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chrome_aws_lambda_1 = __importDefault(require("chrome-aws-lambda"));
var puppeteer = chrome_aws_lambda_1.default.puppeteer;
const mysql_1 = __importDefault(require("mysql"));
const convenience_store_info = [
    {
        name: 'LAWSON',
        url: 'https://www.lawson.co.jp/recommend/new/',
        target: '.heightLineParent > li',
    },
    {
        name: 'FamilyMart',
        url: 'https://www.family.co.jp/goods/newgoods.html',
        target: '.ly-mod-layout-4clm > .ly-mod-layout-clm',
    },
];
module.exports.handler = async (event, context) => {
    const browser = await puppeteer.launch({
        args: chrome_aws_lambda_1.default.args,
        defaultViewport: chrome_aws_lambda_1.default.defaultViewport,
        executablePath: await chrome_aws_lambda_1.default.executablePath,
        headless: chrome_aws_lambda_1.default.headless,
    });
    const promiseList = [];
    convenience_store_info.forEach((information) => {
        promiseList.push((async () => {
            const page = await browser.newPage();
            const res = await page.goto(information.url);
            if (res.status() !== 200)
                return `${res.status()} ERROR`;
            if (information.name === 'LAWSON')
                await page.waitForNavigation();
            const lists = await page.$$eval(information.target, (datas) => {
                const listBox = [];
                datas.forEach((data) => {
                    let list;
                    if (document.title.match(/ローソン/)) {
                        list = {
                            href: data.querySelector('a')?.href,
                            img: data.querySelector('img')?.src,
                            title: data.querySelector('.ttl')?.textContent,
                            kcal: data.querySelector('.ttl')?.nextElementSibling
                                ?.textContent,
                            price: data.querySelector('.price')?.textContent,
                            release_date: data.querySelector('.date > span')?.textContent.replace(/\./g, '-'),
                            caution: data.querySelector('.smalltxt')?.textContent ||
                                null,
                        };
                        listBox.push(list);
                    }
                    else if (document.title.match(/ファミリーマート/)) {
                        list = {
                            href: data.querySelector('a')?.href,
                            img: data.querySelector('img')?.src,
                            title: data.querySelector('.ly-mod-infoset4-ttl')
                                ?.textContent.trim(),
                            price: data.querySelector('.ly-mod-infoset4-txt')
                                ?.textContent
                                .replace(/\n/g, '')
                                .replace(/\t/g, ''),
                        };
                        listBox.push(list);
                    }
                });
                return listBox;
            });
            await page.close();
            return lists;
        })().catch((e) => console.error(e)));
    });
    await Promise.all(promiseList).then((promise) => {
        const localFlg = process.env.NODE_ENV === 'local' ? true : false;
        const connection = mysql_1.default.createConnection({
            host: localFlg
                ? 'localhost'
                : 'new-goods-instance.czcshofywjfu.ap-northeast-1.rds.amazonaws.com',
            user: localFlg ? 'root' : 'noma',
            password: 'Toeic900',
            database: 'convenience_store_info',
        });
        connection.connect((err) => {
            if (err) {
                console.log('error connecting:' + err.stack);
                return;
            }
            console.log('success');
        });
        const timestanp = new Date();
        const year = timestanp.getFullYear();
        const month = timestanp.getMonth() + 1;
        const day = timestanp.getDate();
        const date = `${year}-${month}-${day}`;
        promise.forEach((valueBox) => {
            valueBox.forEach((value) => {
                if (value.href.match(/lawson/)) {
                    connection.query(`INSERT INTO new_goods (date, name, href, img, title, price, kcal, release_date, caution) VALUES
            ('${date}','LAWSON', '${value.href}', '${value.img}', '${value.title}', '${value.price}', '${value.kcal}', '${value.release_date}', '${value.caution}')`, (error, results) => {
                        if (error)
                            throw error;
                    });
                }
                else if (value.href.match(/family/)) {
                    connection.query(`INSERT INTO new_goods (date, name, href, img, title, price) VALUES
            ('${date}','FamilyMart', '${value.href}', '${value.img}', '${value.title}', '${value.price}')`, (error, results) => {
                        if (error)
                            throw error;
                    });
                }
            });
        });
        browser.close();
        connection.end();
        return context.succeed();
    });
};
