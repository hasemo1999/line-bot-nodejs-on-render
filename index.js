// 📦 必須モジュールを読み込み
import express from 'express'
import { middleware, Client } from '@line/bot-sdk'
import axios from 'axios'
import FormData from 'form-data'

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
}

const app = express()
app.use(middleware(config))
const client = new Client(config)

// 🔁 Webhook の受信
app.post('/webhook', async (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then((result) => res.json(result))
})

// 🧠 Vision APIを呼び出して画像を解析する関数
async function analyzeImageWithOpenAI(imageBuffer) {
  const base64Image = imageBuffer.toString('base64')
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'このチャート画像からMACDやRSIのシグナルが出ているか分析して、買いか売りか判断して。',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )
  return response.data.choices[0].message.content
}

// 🎯 イベント処理（画像を検出したら解析＆通知）
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'image') {
    return Promise.resolve(null)
  }

  const messageId = event.message.id
  const stream = await client.getMessageContent(messageId)

  // 画像データをBufferに変換
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  const imageBuffer = Buffer.concat(chunks)

  // ChatGPT Visionで分析
  const analysis = await analyzeImageWithOpenAI(imageBuffer)

  // Discordに通知（任意）
  await axios.post(process.env.DISCORD_WEBHOOK_URL, {
    content: `📊 画像分析結果（by ChatGPT）\n${analysis}`,
  })

  // LINEに返信
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `🔍 画像を分析したよ！\n${analysis}`,
  })
}

// 🚀 起動
app.listen(3000, () => {
  console.log('LINE Bot is running on port 3000')
})