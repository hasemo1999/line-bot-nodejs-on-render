// 📦 修正済み index.js（LINE画像 → ChatGPT分析 → LINE返信）
import express from 'express';
import { middleware, Client } from '@line/bot-sdk';
import axios from 'axios';

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();
app.use(express.json()); // JSON解析を先に
app.use(middleware(config));

const client = new Client(config);

app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  if (!events || events.length === 0) {
    return res.sendStatus(200);
  }

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
          {
            role: 'system',
            content: 'あなたは株チャートの専門家です。画像から情報を分析して説明してください。',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'この画像の株チャートを分析して、重要なポイントを教えてください。' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
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
    console.error('エラー:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '画像分析中にエラーが発生しました💦',
    });
  }
}

// 🔧 Render用ポート設定
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`LINE bot server running on port ${port}`);
});