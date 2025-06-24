import express from 'express';
import { middleware, Client } from '@line/bot-sdk';
import axios from 'axios';

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const app = express();
app.use(middleware(config));

const client = new Client(config);

app.post('/webhook', async (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result));
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'image') {
    return Promise.resolve(null);
  }

  // LINE画像の一時URLを取得
  const messageId = event.message.id;
  const imageUrl = `https://api-data.line.me/v2/bot/message/${messageId}/content`;

  // LINE画像 → base64
  const imageData = await axios.get(imageUrl, {
    headers: {
      Authorization: `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`
    },
    responseType: 'arraybuffer'
  });

  const base64Image = Buffer.from(imageData.data, 'binary').toString('base64');

  // OpenAI Vision API で画像解析
  const openaiResponse = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたは株チャートの専門家です。'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'この画像の株チャートを分析して、重要なポイントを教えてください。' },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 500
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const reply = openaiResponse.data.choices[0].message.content;

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: reply
  });
}

app.listen(10000);