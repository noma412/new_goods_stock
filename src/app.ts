import puppeteer from 'puppeteer'
import mysql from 'mysql'

const convenience_store_info = [
  // {
  //   name: 'LAWSON',
  //   url: 'https://www.lawson.co.jp/recommend/new/',
  //   target: '.heightLineParent > li',
  // },
  // {
  //   name: 'FamilyMart',
  //   url: 'https://www.family.co.jp/goods/newgoods.html',
  //   target: '.ly-mod-layout-4clm > .ly-mod-layout-clm',
  // },
  {
    name: 'SEVEN-ELEVEN',
    url: 'https://www.sej.co.jp/products/a/thisweek/area/kanto/1/l100/',
    target: '.flex_wrap > .list_inner',
  },
]
type list = {
  href: string
  img: string
  title: string
  price: string
  kcal?: string
  release_date?: string
  caution?: string | null
}

const stock = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 300,
  })
  const promiseList: any[] = []
  convenience_store_info.forEach((information) => {
    promiseList.push(
      (async () => {
        const page = await browser.newPage()
        const res = await page.goto(information.url)
        if (res.status() !== 200) return `${res.status()} ERROR`
        await page.evaluate(() => {
          ;(document.scrollingElement as HTMLElement).scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth',
          })
        })
        await page.waitFor(5000)
        if (information.name === 'LAWSON') await page.waitForNavigation()
        const lists = await page.$$eval(information.target, (datas) => {
          const lists: list[] = []
          datas.forEach((data) => {
            let list: list
            if (document.title.match(/ローソン/)) {
              list = {
                href: data.querySelector('a')?.href as string,
                img: data.querySelector('img')?.src as string,
                title: data.querySelector('.ttl')?.textContent as string,
                kcal: data.querySelector('.ttl')?.nextElementSibling
                  ?.textContent as string,
                price: data.querySelector('.price')?.textContent as string,
                release_date: (
                  data.querySelector('.date > span')?.textContent as string
                ).replace(/\./g, '-'),
                caution:
                  (data.querySelector('.smalltxt')?.textContent as string) ||
                  null,
              }
              lists.push(list)
            } else if (document.title.match(/ファミリーマート/)) {
              list = {
                href: data.querySelector('a')?.href as string,
                img: data.querySelector('img')?.src as string,
                title: (
                  data.querySelector('.ly-mod-infoset4-ttl')
                    ?.textContent as string
                ).trim(),
                price: (
                  data.querySelector('.ly-mod-infoset4-txt')
                    ?.textContent as string
                )
                  .replace(/\n/g, '')
                  .replace(/\t/g, ''),
              }
              lists.push(list)
            } else if (document.title.match(/セブン‐イレブン/)) {
              let releaseDate = data.querySelector('.item_launch > p')
                ?.textContent as string
              releaseDate = releaseDate.substring(0, releaseDate.indexOf('（'))
              ;(releaseDate = releaseDate
                .replace(/年/g, '-')
                .replace(/月/g, '-')
                .replace(/日/g, '-')),
                (list = {
                  href: data.querySelector('a')?.href as string,
                  img: data.querySelector('img')?.src as string,
                  title: (
                    data.querySelector('.item_ttl a')?.textContent as string
                  ).trim(),
                  price: (
                    data.querySelector('.item_price p')?.textContent as string
                  )
                    .replace(/\n/g, '')
                    .replace(/\t/g, ''),
                  release_date: releaseDate,
                })
              lists.push(list)
            }
          })
          return lists
        })
        await page.close()
        return lists
      })().catch((e) => console.error(e))
    )
  })

  await Promise.all(promiseList).then((promise) => {
    const localFlg: boolean = process.env.NODE_ENV === 'local' ? true : false
    const connection = mysql.createConnection({
      host: localFlg
        ? 'localhost'
        : 'new-goods-instance.czcshofywjfu.ap-northeast-1.rds.amazonaws.com',
      user: localFlg ? 'root' : 'noma',
      password: 'Toeic900',
      database: 'convenience_store_info',
    })
    connection.connect((err) => {
      if (err) {
        console.log('error connecting:' + err.stack)
        return
      }
      console.log('success')
    })
    const timestanp = new Date()
    const year = timestanp.getFullYear()
    const month = timestanp.getMonth() + 1
    const day = timestanp.getDate()
    const date = `${year}-${month}-${day}`
    promise.forEach((valueBox: list[]) => {
      valueBox.forEach((value) => {
        if (value.href.match(/lawson/)) {
          connection.query(
            `INSERT INTO new_goods (date, name, href, img, title, price, kcal, release_date, caution) VALUES
            ('${date}','LAWSON', '${value.href}', '${value.img}', '${value.title}', '${value.price}', '${value.kcal}', '${value.release_date}', '${value.caution}')`,
            (error, results) => {
              if (error) throw error
            }
          )
        } else if (value.href.match(/family/)) {
          connection.query(
            `INSERT INTO new_goods (date, name, href, img, title, price) VALUES
            ('${date}','FamilyMart', '${value.href}', '${value.img}', '${value.title}', '${value.price}')`,
            (error, results) => {
              if (error) throw error
            }
          )
        } else if (value.href.match(/sej/)) {
          connection.query(
            `INSERT INTO new_goods (date, name, href, img, title, price, release_date) VALUES
            ('${date}','SEVEN-ELEVEN', '${value.href}', '${value.img}', '${value.title}', '${value.price}', '${value.release_date}')`,
            (error, results) => {
              if (error) throw error
            }
          )
        }
      })
    })

    browser.close()
    connection.end()
  })
}

module.exports.handler = stock
export default stock
