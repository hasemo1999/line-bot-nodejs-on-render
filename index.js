const express = require('express');
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const app = express();
app.use(line.middleware(config));

const client = new line.Client(config);

app.post('/webhook', (req, res) => {
  Promise
    .all(req.body.events.map(event => {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'こんにちは！'
      });
    }))
    .then(() => res.end())
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

app.listen(3000);