import express from 'express';
import { middleware, Client } from '@line/bot-sdk';
import axios from 'axios';

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();

// LINEの署名検証を先に
app.post('/webhook', middleware(config), async (req, res) => {
  const client = new Client(config);

  const results = await Promise.all(req.body.events.map(async (event) => {
    if (event.type !== 'message' || event.message.type !== 'image') {
      return Promise.resolve(null);
    }

    // 画像ID取得
    const messageId = event.message.id;
    const imageUrl = `https://api-data.line.me/v2/bot/message/${messageId}/content`;

    // LINE画像をBase64へ変換
    const imageData = await axios.get(imageUrl, {
      headers: {
        Authorization: `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`,
      },
      responseType: 'arraybuffer',
    });

    const base64Image = Buffer.from(imageData.data, 'binary').toString('base64');

    // OpenAI Vision APIに送信
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
              { type: 'text', text: 'この株チャートを分析してください' },
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
  }));

  res.json(results);
});

app.listen(10000, () => {
  console.log('LINE bot server running on port 10000');
});