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

app.post('/webhook', async (req, res) => {
  const event = req.body.events[0];
  if (event.type !== 'message' || event.message.type !== 'text') {
    return res.sendStatus(200);
  }

  const text = event.message.text;
  let symbol = '';
  
  const symbolMap = {
  '任天堂': '7974.T',
  'トヨタ': '7203.T',
  'カプコン': '9697.T',
  '大塚': '4578.T',
  'サンリオ': '8136.T',
  'フジクラ': '5803.T',
  'ゼネテック': '4492.T',
  'BTC': 'BTC-USD',
  'ビットコイン': 'BTC-USD'
};
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

// 株価データを取得（TradingView APIを想定）
async function getStockPrice(symbol) {
  const response = await axios.get(`https://your-api.com/stocks/${symbol}`);
  return response.data.price;
}

// 分析（酒田五法, MACD, RSI, 出来高など総合判断）
async function analyzeStock(symbol, currentPrice) {
  // PDFや記憶データを活用した複雑な判断ロジック（仮）
  const analysis = {
    shouldBuy: false,
    shouldSell: false,
    reason: '',
    entryPoint: 0,
    takeProfit: 0,
    stopLoss: 0,
  };

  // 例: 酒田五法などのテクニカル分析をここに入れる
  if (currentPrice < 13200) {
    analysis.shouldBuy = true;
    analysis.reason = '酒田五法で三川明けの明星形成中';
    analysis.entryPoint = currentPrice;
    analysis.takeProfit = currentPrice + 150;
    analysis.stopLoss = currentPrice - 50;
  } else if (currentPrice > 13300) {
    analysis.shouldSell = true;
    analysis.reason = 'MACDでデッドクロス発生';
    analysis.entryPoint = currentPrice;
    analysis.takeProfit = currentPrice - 150;
    analysis.stopLoss = currentPrice + 50;
  }

  return analysis;
}

// LINEに分析結果を通知
async function sendLineNotification(userId, message) {
  await client.pushMessage(userId, { type: 'text', text: message });
}
// 📊 定期実行関数（CronJob推奨）
async function checkAndNotify(...) {
  // 
}
// 定期実行関数（CronJob推奨）
async function checkAndNotify(symbol, userId) {
  const currentPrice = await getStockPrice(symbol);
  const analysis = await analyzeStock(symbol, currentPrice);

  if (analysis.shouldBuy || analysis.shouldSell) {
    const direction = analysis.shouldBuy ? '📈 買い推奨' : '📉 売り推奨';
    const msg = `${direction}\n銘柄: ${symbol}\n現在価格: ${currentPrice}円\n理由: ${analysis.reason}\nエントリーポイント: ${analysis.entryPoint}円\n利確目標: ${analysis.takeProfit}円\n損切りライン: ${analysis.stopLoss}円`;
    await sendLineNotification(userId, msg);
  }
}

// TradingView Webhook
app.post('/alert', async (req, res) => {
  const { symbol, price } = req.body;
  const analysis = await analyzeStock(symbol, price);

  if (analysis.shouldBuy || analysis.shouldSell) {
    const direction = analysis.shouldBuy ? '📈 買い推奨' : '📉 売り推奨';
    const message = `${direction}\n銘柄: ${symbol}\n現在価格: ${price}円\n理由: ${analysis.reason}\nエントリーポイント: ${analysis.entryPoint}円\n利確目標: ${analysis.takeProfit}円\n損切りライン: ${analysis.stopLoss}円`;
    await sendLineNotification(process.env.USER_ID, message);
  }

  res.status(200).send('通知完了');
});

// Render用ポート設定
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`株価予測Bot稼働中 (port: ${port})`);
});
