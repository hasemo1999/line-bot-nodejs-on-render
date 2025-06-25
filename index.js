// 📊【しん専用 株価予測Bot】LINE連携・分析結果通知（Node.js版）

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

// 📩 LINEメッセージ受信（株価チェック）
app.post('/webhook', async (req, res) => {
  const event = req.body.events[0];
  if (event.type !== 'message' || event.message.type !== 'text') {
    return res.sendStatus(200);
  }

  const text = event.message.text;

  const symbolMap = new Map([
    ['任天堂', '7974.T'],
    ['トヨタ', '7203.T'],
    ['カプコン', '9697.T'],
    ['大塚', '4578.T'],
    ['サンリオ', '8136.T'],
    ['フジクラ', '5803.T'],
    ['ゼネテック', '4492.T'],
    ['オリックス', '8591.T'],
    ['エフ・コード', '9211.T'],
    ['中外製薬', '4519.T'],
    ['大成建設', '1801.T'],
    ['バンダイナムコ', '7832.T'],
    ['サッポロ', '2501.T'],
    ['メタプラネット', '3350.T'],
    ['ビットコイン', 'BTC-USD'],
    ['BTC', 'BTC-USD']
  ]);

  const entry = [...symbolMap.entries()].find(([key]) => text.includes(key));
  if (!entry) {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'その銘柄はまだ対応していないよ💦'
    });
    return res.sendStatus(200);
  }

  const [name, symbol] = entry;

  try {
    const response = await axios.get('https://yahoo-finance15.p.rapidapi.com/api/v1/markets/stock/quotes', {
      params: { symbol },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com'
      }
    });

    const price = response.data.body[0].regularMarketPrice;
    const reply = `📈 ${name}（${symbol}）の現在価格は ${price}円です！`;

    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: reply
    });
  } catch (error) {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '価格取得に失敗しました💦'
    });
  }

  res.sendStatus(200);
});

// Render用ポート設定
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ 株価予測Bot稼働中 (port: ${port})`);
});
