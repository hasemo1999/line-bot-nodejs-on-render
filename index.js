import express from 'express';
import { middleware, Client } from '@line/bot-sdk';

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const app = express();

app.use(middleware(config));

const client = new Client(config);

// Webhook エンドポイント
app.post('/webhook', (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// イベント処理ロジック
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `「${event.message.text}」って言ったね！`
  });
}

// 動作確認用ルート（重要！）
app.get('/', (req, res) => {
  res.send('LINE Bot is running!');
});

// Render 用ポート設定
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});