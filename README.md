# コンビニの商品情報を取得してデータベースに保管する

**● 機能**

- コンビニの商品情報を取得してデータベース(RDS)に保管します。
- 情報源となるコンビニは以下の 3 つです。
  - https://www.lawson.co.jp/recommend/new/ (ローソン)
  - https://www.family.co.jp/goods/newgoods.html (ファミリーマート)
  - https://www.sej.co.jp/products/a/thisweek/area/kanto/1/l100/ (セブンイレブン)
- 週に一度自動で実行されます。

**● 動作環境**

- Lambda

**● 使用言語**

- Typescript

**● 使用ライブラリ**

- puppetter

**● ウェブサイト**

- https://noma412.github.io/new_goods_front/
