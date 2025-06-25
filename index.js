// ・・・ 【📊 しん専用 index.js 】symbolMap 完全対応バージョン

import express from 'express';
import { middleware, Client } from '@line/bot-sdk';
import axios from 'axios';

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();
const client = new Client(config);

app.use(express.json());
app.use(middleware(config));

const symbolMap = {
  '任天堂': '7974.T',
  'カプコン': '9697.T',
  'サンリオ': '8136.T',
  'フジクラ': '5803.T',
  'ゼネテック': '4492.T',
  '大塚HD': '4578.T',
  'エフコード': '9211.T',
  'ジグザグ': '3679.T',
  'USS': '4732.T',
  'バンダイナムコ': '7832.T',
  'サッポロ': '2501.T',
  '中外製薬': '4519.T',
  '大成建設': '1801.T',
  'オリックス': '8591.T',
  'ビットコイン': 'BTC-USD',
  'BTC': 'BTC-USD'
};

app.post('/webhook', async (req, res) => {
  const event = req.body.events[0];
  if (event.type !== 'message' || event.message.type !== 'text') {
    return res.sendStatus(200);
  }

  const text = event.message.text;
  let symbol = '';

  for (const key in symbolMap) {
    if (text.includes(key)) {
      symbol = symbolMap[key];
      break;
    }
  }

  if (!symbol) {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'その銘柄はまだ対応してないよ💦'
    });
    return res.sendStatus(200);
  }

  try {
    const response = await axios.get('https://yahoo-finance15.p.rapidapi.com/api/v1/markets/stock/quotes', {
      params: { symbol: symbol },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com'
      }
    });

    const price = response.data.body[0].regularMarketPrice;

    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `📈 ${symbol}の現在価格は ${price}円 です！`
    });
  } catch (error) {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '価格取得に失敗しました💦'
    });
  }

  res.sendStatus(200);
});
console.log("📍受信テキスト:", text);
console.log("📍変換されたsymbol:", symbol);
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`株価予測Bot稼働中 (port: ${port})`);
});
