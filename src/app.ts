import chromium from 'chrome-aws-lambda'
import mysql from 'mysql'

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

module.exports.handler = async (event: any, context: any) => {
  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
  })
  const promiseList: any[] = []
  convenience_store_info.forEach((information) => {
    promiseList.push(
      (async () => {
        const page = await browser.newPage()
        const res = await page.goto(information.url)
        if (res.status() !== 200) return `${res.status()} ERROR`
        if (information.name === 'LAWSON') await page.waitForNavigation()
        const lists: list[] = await page.$$eval(
          information.target,
          (datas: any[]) => {
            const listBox: list[] = []
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
                listBox.push(list)
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
                listBox.push(list)
              }
            })
            return listBox
          }
        )
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
            (err) => {
              if (err) console.log('error connecting:' + err.stack)
            }
          )
        } else if (value.href.match(/family/)) {
          connection.query(
            `INSERT INTO new_goods (date, name, href, img, title, price) VALUES
            ('${date}','FamilyMart', '${value.href}', '${value.img}', '${value.title}', '${value.price}')`,
            (err) => {
              if (err) console.log('error connecting:' + err.stack)
            }
          )
        }
      })
    })

    browser.close()
    connection.end()
    context.succeed()
  })
}
