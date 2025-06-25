// 📦 完全修正版 index.js（LINE画像解析 + TradingView通知）
import express from 'express';
import { middleware, Client } from '@line/bot-sdk';
import axios from 'axios';

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();
const client = new Client(config);

// LINE webhook（画像解析）
app.post('/webhook', middleware(config), async (req, res) => {
  const events = req.body.events;
  if (!events || events.length === 0) return res.sendStatus(200);

  const results = await Promise.all(events.map(handleEvent));
  res.json(results);
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'image') {
    return Promise.resolve(null);
  }

  try {
    const messageId = event.message.id;
    const imageUrl = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
    const imageData = await axios.get(imageUrl, {
      headers: {
        Authorization: `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`,
      },
      responseType: 'arraybuffer',
    });

    const base64Image = Buffer.from(imageData.data, 'binary').toString('base64');

    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'あなたは株チャートの専門家です。画像を分析してください。' },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'この画像の株チャートを分析して、重要なポイントを教えてください。' },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Image}` },
              },
            ],
          },
        ],
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = openaiResponse.data.choices[0].message.content;
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: reply,
    });
  } catch (error) {
    console.error('画像解析エラー:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '画像分析中にエラーが発生しました💦',
    });
  }
}

// TradingViewアラート受信（LINE通知）
app.post('/alert', express.json(), async (req, res) => {
  try {
    const message = req.body.message || '📢 TradingViewアラート受信！';
    await client.pushMessage(process.env.USER_ID, {
      type: 'text',
      text: message,
    });
    res.status(200).send('OK');
  } catch (err) {
    console.error('アラート送信エラー:', err);
    res.status(500).send('NG');
  }
});

// ポート設定（Render用）
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`LINE bot server running on port ${port}`);
});