const express = require('express'); 
const fs = require('fs');
const app = express();
app.use(express.json());
let links = {};

app.use((req, res, next) => {
  const logMessage = new Date().toISOString() + ' - ' + req.method + ' ' + req.url + ' from ' + req.ip + '\n';
  fs.appendFileSync('log.txt', logMessage); 
  next();
});

function createRandomCode() {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomCode = '';
  for (let i = 0; i < 6; i++) {
    const id = Math.floor(Math.random() * characters.length);
    randomCode += characters[id];
  }
  return randomCode;
}

function isURLValid(text) {
  try {
    new URL(text);
    return true;
  } catch(err) {
    return false;
  }
}

app.post('/shorturls', (request, response) => {
  let { url, validity, shortcode } = request.body;

  if (!url || !isURLValid(url)) {
    return response.status(400).json({ error: 'Please give a valid URL' });
  }
  if (!validity || typeof validity !== 'number' || validity <= 0) {
    validity = 30;
  }
  if (!shortcode) {
  do {
    shortcode = createRandomCode();
  } while (links[shortcode]);
} else {
  const isFormatCorrect = /^[a-zA-Z0-9]{3,20}$/;
  if (!isFormatCorrect.test(shortcode)) {
    return response.status(400).json({ error: 'Shortcode must be Valid' });
  }
  if (links[shortcode]) {
    return response.status(409).json({ error: 'shortcode is already taken.' });
  }
}

  const currentTime = new Date();
  const endTime = new Date(currentTime.getTime() + validity * 60000); 

  links[shortcode] = {
    fullUrl: url,
    createdTime: currentTime,
    endTime: endTime,
    clicks: []
  };

  response.status(201).json({
    shortLink: request.protocol + '://' + request.get('host') + '/' + shortcode,
    expiry: endTime.toISOString()
  });
});

app.get('/:code', (request, response) => {
  const code = request.params.code;
  const info = links[code];

  if (!info) {
    return response.status(404).json({ error: 'Link not found' });
  }

  const now = new Date();
  if (now > info.endTime) {
    return response.status(404).json({ error: 'link is expired' });
  }

  info.clicks.push({
    visitedAt: now.toISOString(),
    from: request.get('Referer') || 'direct',
    ipAddress: request.ip
  });

  response.redirect(info.fullUrl);
});

app.get('/shorturls/:code', (request, response) => {
  const code = request.params.code;
  const info = links[code];
  if (!info) {
    return response.json({ error: 'Shortcode not found' });
  }

  response.json({
    originalUrl: info.fullUrl,
    createdTime: info.createdTime.toISOString(),
    expiresAt: info.endTime.toISOString(),
    totalVisitors: info.clicks.length,
    visitorDetails: info.clicks
  });
});

app.listen(3000, () => {
  console.log('Connection Success...');
});
