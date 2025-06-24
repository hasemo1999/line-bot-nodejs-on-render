// 必要なモジュールを読み込み
import express from 'express';
import { middleware, Client } from '@line/bot-sdk';
import fetch from 'node-fetch'; // ← Discord通知に使う

// 環境変数の設定（LINE + Discord）
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

const app = express();
app.use(middleware(config));
const client = new Client(config);

// Discord通知の関数
async function sendToDiscord(message, imageUrl = null) {
  const payload = {
    content: message,
  };

  if (imageUrl) {
    payload.embeds = [{ image: { url: imageUrl } }];
  }

  try {
    const res = await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error('❌ Discord通知失敗:', res.statusText);
    }
  } catch (err) {
    console.error('❌ Discord送信エラー:', err);
  }
}

// LINEからのメッセージ受信時の処理
app.post('/webhook', (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then(result => res.json(result));
});

// メッセージイベントの処理
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userText = event.message.text;

  // ① LINEに返信
  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: `「${userText}」って言ったね！`,
  });

  // ② Discordにも通知
  await sendToDiscord(`LINEからの新メッセージ📩: ${userText}`);

  return Promise.resolve();
}

// ポート設定（Render環境用）
app.listen(process.env.PORT || 3000);