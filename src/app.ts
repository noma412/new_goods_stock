import puppeteer from 'puppeteer'
import mysql from 'mysql'

const url = 'https://www.lawson.co.jp/recommend/new/'
const target = '.heightLineParent > li'
;(async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto(url)
  await page.waitForNavigation()
  const lists = await page.$$eval(target, (datas) => {
    const lists: {
      href: string
      img: string
      title: string
      kcal: string
      price: string
      date: string
      caution: string
    }[] = []
    datas.forEach((data) => {
      const list = {
        href: data.querySelector('a')?.href as string,
        img: data.querySelector('img')?.src as string,
        title: data.querySelector('.ttl')?.textContent as string,
        kcal: data.querySelector('.ttl')?.nextElementSibling
          ?.textContent as string,
        price: data.querySelector('.price')?.textContent as string,
        date: data.querySelector('.date > span')?.textContent as string,
        caution: (data.querySelector('.smalltxt')?.textContent as string) || '',
      }
      lists.push(list)
    })
    return lists
  })

  console.log(lists)

  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Toeic900',
    database: 'list_app',
  })
  connection.connect((err) => {
    if (err) {
      console.log('error connecting:' + err.stack)
      return
    }
    console.log('success')
  })

  lists.forEach((list) => {
    connection.query(
      `INSERT INTO users (href, img, title, kcal, price, date, caution) VALUES 
      ('${list.href}', '${list.img}', '${list.title}', '${list.kcal}', '${list.price}', '${list.date}', '${list.caution}')`,
      (error, results) => {
        if (error) throw error
        console.log(results)
      }
    )
  })

  connection.end()
  browser.close()
})()
