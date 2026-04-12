const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');

// ============================================================
// AAA GAS ENGINEERING - WHATSAPP CHATBOT v3
// ============================================================

const app = express();
let currentQR = null;
let botStatus = 'Starting up...';

// Web server for QR code
app.get('/', async (req, res) => {
  if (currentQR) {
    const qrImage = await qrcode.toDataURL(currentQR);
    res.send(`
      <html>
        <head>
          <title>AAA Gas Bot - Scan QR</title>
          <meta http-equiv="refresh" content="30">
          <style>
            body { font-family: Arial; text-align: center; padding: 40px; background: #f0f0f0; }
            img { border: 4px solid #25D366; border-radius: 12px; margin: 20px; }
            h2 { color: #075E54; }
            p { color: #555; font-size: 16px; }
            .status { background: #25D366; color: white; padding: 10px 20px; border-radius: 8px; display: inline-block; margin: 10px; }
          </style>
        </head>
        <body>
          <h2>🔥 AAA Gas Engineering - WhatsApp Bot</h2>
          <div class="status">✅ QR Code Ready!</div>
          <p>Open WhatsApp → Settings → Linked Devices → Link a Device</p>
          <p>Scan this QR code:</p>
          <img src="${qrImage}" width="280" height="280"/>
          <p><small>Page auto-refreshes every 30 seconds. If QR expires, refresh manually.</small></p>
        </body>
      </html>
    `);
  } else {
    res.send(`
      <html>
        <head>
          <title>AAA Gas Bot</title>
          <meta http-equiv="refresh" content="5">
          <style>
            body { font-family: Arial; text-align: center; padding: 40px; background: #f0f0f0; }
            h2 { color: #075E54; }
            .status { background: #128C7E; color: white; padding: 10px 20px; border-radius: 8px; display: inline-block; margin: 10px; font-size: 18px; }
          </style>
        </head>
        <body>
          <h2>🔥 AAA Gas Engineering - WhatsApp Bot</h2>
          <div class="status">${botStatus}</div>
          <p><small>Page auto-refreshes every 5 seconds...</small></p>
        </body>
      </html>
    `);
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Web server started on port', process.env.PORT || 3000);
});

// ============================================================
// PRODUCTS DATA
// ============================================================

const PRODUCTS = [
  { cap: '10 kg/hr',  big: '2 large daig burners',       small: '4 small burners',        price: 'PKR 65,000',   type: 'Water Bath', maxBig: 2,  maxSmall: 4  },
  { cap: '15 kg/hr',  big: '2 to 3 large daig burners',  small: '4 to 8 small burners',   price: 'PKR 85,000',   type: 'Water Bath', maxBig: 3,  maxSmall: 8  },
  { cap: '30 kg/hr',  big: '3 to 6 large daig burners',  small: '8 to 12 small burners',  price: 'PKR 1,20,000', type: 'Water Bath', maxBig: 6,  maxSmall: 12 },
  { cap: '50 kg/hr',  big: '6 to 9 large daig burners',  small: '12 to 18 small burners', price: 'PKR 1,95,000', type: 'Water Bath', maxBig: 9,  maxSmall: 18 },
  { cap: '30 kg/hr',  big: '3 to 6 large daig burners',  small: '8 to 12 small burners',  price: 'PKR 2,00,000', type: 'Waterless',  maxBig: 6,  maxSmall: 12 },
  { cap: '50 kg/hr',  big: '6 to 9 large daig burners',  small: '12 to 18 small burners', price: 'PKR 3,00,000', type: 'Waterless',  maxBig: 9,  maxSmall: 18 },
];

const FAQ = {
  diff:     '*Water Bath Vaporizer:*\nUses water to heat LPG. Affordable and widely used. Available 10kg to 50kg/hr.\n\n*Waterless Vaporizer:*\nUses electricity directly. No water needed. Low maintenance. Available in 30kg and 50kg/hr.',
  install:  'Our team visits your location for complete installation. We handle pipe fitting, connections, and full safety testing. Done within 1 to 3 days after delivery. ✅',
  warranty: 'Every vaporizer comes with a *1 year warranty* covering both parts and workmanship. Free repair or replacement within warranty period. ✅',
  maintain: 'Annual servicing is recommended. Waterless models require even less maintenance. We also offer Annual Maintenance Contracts (AMC). ✅',
  delivery: 'Delivery completed within *3 to 7 working days* after order confirmation. ✅',
  payment:  'We accept cash, bank transfer, and cheque. For large orders, 50% advance and 50% on delivery terms available. ✅',
  safety:   'All vaporizers include built-in pressure relief valve, thermostat cutoff, and overheat protection. ✅',
};

const userState = {};
const ADMIN_NUMBER = '923177271509@c.us';
const stoppedNumbers = new Set();

// ============================================================
// MESSAGE TEMPLATES
// ============================================================

const mainMenu = () => `👋 *Assalam o Alaikum!*

Welcome to *AAA Gas Engineering!* 🔥

We are specialists in *AAA LPG Vaporizers.*
Water Bath (10–50 kg/hr) and Waterless (30–50 kg/hr) both available.

Reply with a number:

*1* - 📦 Products & Prices
*2* - 🔍 Recommend a Model
*3* - ⚖️ Water Bath vs Waterless
*4* - ❓ FAQs
*5* - 📋 Get a Quote
*6* - 📞 Contact Us`;

const productsMenu = () => `📦 *Our LPG Vaporizer Models*

*1* - 🔵 Water Bath Models (4 models)
*2* - 🟢 Waterless Models (2 models)
*3* - ⚖️ What is the difference?
*0* - 🏠 Main Menu`;

const waterBathList = () => `🔵 *Water Bath Vaporizers*

*1* - ⚡ 10 kg/hr — PKR 65,000
*2* - ⚡ 15 kg/hr — PKR 85,000
*3* - ⚡ 30 kg/hr — PKR 1,20,000
*4* - ⚡ 50 kg/hr — PKR 1,95,000
*0* - 🏠 Main Menu`;

const waterlessList = () => `🟢 *Waterless Vaporizers*

*1* - ⚡ 30 kg/hr — PKR 2,00,000
*2* - ⚡ 50 kg/hr — PKR 3,00,000
*0* - 🏠 Main Menu`;

const productDetail = (p) => `*AAA LPG Vaporizer — ${p.cap}* (${p.type})

🍲 Large daig burners: *${p.big}*
🍳 Small burners (fast food/karahi/Chinese): *${p.small}*
💰 Price: *${p.price}*

✅ Installation included
✅ 1 year warranty

*1* - Order This
*2* - See All Models
*0* - Main Menu`;

const recommendMenu = () => `🔍 *Find the Right Model for You*

What type of burners do you have?

*1* - 🍲 Large daig burners
*2* - 🍳 Small burners (fast food/karahi/Chinese)
*3* - 🔀 Both types
*0* - 🏠 Main Menu`;

const bigCount = () => `How many *large daig burners* do you have?

*1* - 1 to 2 burners
*2* - 2 to 3 burners
*3* - 3 to 6 burners
*4* - 6 to 9 burners
*5* - More than 9
*0* - Main Menu`;

const smallCount = () => `How many *small burners* do you have?
(fast food / karahi / Chinese stove)

*1* - 1 to 4 burners
*2* - 4 to 8 burners
*3* - 8 to 12 burners
*4* - 12 to 18 burners
*5* - More than 18
*0* - Main Menu`;

const recResult = (p) => `✅ *Best Recommended Model for Your Setup:*

🔥 *AAA LPG Vaporizer ${p.cap}* (${p.type})
🍲 Large daig burners: *${p.big}*
🍳 Small burners: *${p.small}*
💰 Price: *${p.price}*

✅ Installation included | 1 year warranty

*1* - Order This
*2* - See Waterless Options
*0* - Main Menu`;

const faqMenu = () => `❓ *Frequently Asked Questions*

*1* - Water Bath vs Waterless difference
*2* - How is installation done
*3* - Warranty details
*4* - Maintenance requirements
*5* - Delivery time
*6* - Payment terms
*7* - Safety features
*0* - 🏠 Main Menu`;

const contactMsg = () => `📞 *AAA Gas Engineering*

📱 WhatsApp / Call: *03177271509*
🕐 Available: 9am to 8pm (Mon–Sat)

You can message us directly on WhatsApp anytime!

*0* - 🏠 Main Menu`;

function getProduct(count, type) {
  const wb = PRODUCTS.filter(p => p.type === 'Water Bath');
  for (const p of wb) {
    const limit = type === 'big' ? p.maxBig : p.maxSmall;
    if (count <= limit) return p;
  }
  return PRODUCTS[3];
}

// ============================================================
// MESSAGE HANDLER
// ============================================================

async function handleMessage(client, msg) {
  const jid = msg.from;
  if (!jid || jid === 'status@broadcast') return;

  const text = msg.body.trim();
  if (!text) return;

  const send = async (message) => {
    await client.sendMessage(jid, message);
  };

  // ---- ADMIN COMMANDS ----
  if (jid === ADMIN_NUMBER) {
    if (text.toUpperCase().startsWith('STOP ')) {
      const target = text.split(' ')[1] + '@c.us';
      stoppedNumbers.add(target);
      await send(`✅ Bot stopped for ${text.split(' ')[1]}`);
      return;
    }
    if (text.toUpperCase().startsWith('START ')) {
      const target = text.split(' ')[1] + '@c.us';
      stoppedNumbers.delete(target);
      await send(`✅ Bot started for ${text.split(' ')[1]}`);
      return;
    }
    if (text.toUpperCase() === 'STOPALL') {
      userState['GLOBAL_STOP'] = true;
      await send('✅ Bot stopped for ALL users.');
      return;
    }
    if (text.toUpperCase() === 'STARTALL') {
      userState['GLOBAL_STOP'] = false;
      await send('✅ Bot started for ALL users.');
      return;
    }
  }

  if (userState['GLOBAL_STOP'] === true) return;
  if (stoppedNumbers.has(jid)) return;
  if (msg.fromMe) return;

  if (!userState[jid]) userState[jid] = { step: 'main' };
  const state = userState[jid];

  if (text === '0') {
    userState[jid] = { step: 'main' };
    await send(mainMenu());
    return;
  }

  // MAIN
  if (state.step === 'main') {
    const greet = ['hi','hello','hey','salam','assalam','start','menu','hii','hlw','helo'];
    if (greet.includes(text.toLowerCase())) { await send(mainMenu()); return; }
    if (text === '1') { userState[jid].step = 'products'; await send(productsMenu()); }
    else if (text === '2') { userState[jid].step = 'recommend'; await send(recommendMenu()); }
    else if (text === '3') { await send(FAQ.diff + '\n\n*0* - Main Menu'); }
    else if (text === '4') { userState[jid].step = 'faq'; await send(faqMenu()); }
    else if (text === '5') { userState[jid].step = 'quote1'; await send('📋 *Get a Quote*\n\nStep 1 of 4: Please type your *full name*.'); }
    else if (text === '6') { await send(contactMsg()); }
    else { await send(mainMenu()); }
    return;
  }

  // PRODUCTS
  if (state.step === 'products') {
    if (text === '1') { userState[jid].step = 'water_bath'; await send(waterBathList()); }
    else if (text === '2') { userState[jid].step = 'waterless'; await send(waterlessList()); }
    else if (text === '3') { await send(FAQ.diff + '\n\n*0* - Main Menu'); }
    else { await send(productsMenu()); }
    return;
  }

  if (state.step === 'water_bath') {
    const idx = parseInt(text) - 1;
    if (idx >= 0 && idx <= 3) { userState[jid].step = 'product_detail'; userState[jid].selectedProduct = PRODUCTS[idx]; await send(productDetail(PRODUCTS[idx])); }
    else { await send(waterBathList()); }
    return;
  }

  if (state.step === 'waterless') {
    const idx = parseInt(text) - 1;
    if (idx >= 0 && idx <= 1) { userState[jid].step = 'product_detail'; userState[jid].selectedProduct = PRODUCTS[4 + idx]; await send(productDetail(PRODUCTS[4 + idx])); }
    else { await send(waterlessList()); }
    return;
  }

  if (state.step === 'product_detail') {
    if (text === '1') { userState[jid].step = 'quote1'; await send('📋 *Get a Quote*\n\nStep 1 of 4: Please type your *full name*.'); }
    else if (text === '2') { userState[jid].step = 'products'; await send(productsMenu()); }
    else { await send(productDetail(state.selectedProduct)); }
    return;
  }

  // RECOMMEND
  if (state.step === 'recommend') {
    if (text === '1') { userState[jid].step = 'rec_big'; await send(bigCount()); }
    else if (text === '2') { userState[jid].step = 'rec_small'; await send(smallCount()); }
    else if (text === '3') { userState[jid].step = 'rec_small'; await send(smallCount()); }
    else { await send(recommendMenu()); }
    return;
  }

  if (state.step === 'rec_big') {
    const counts = [2, 3, 6, 9, 10];
    const idx = parseInt(text) - 1;
    if (idx >= 0 && idx < counts.length) { const p = getProduct(counts[idx], 'big'); userState[jid].step = 'rec_result'; userState[jid].selectedProduct = p; await send(recResult(p)); }
    else { await send(bigCount()); }
    return;
  }

  if (state.step === 'rec_small') {
    const counts = [4, 8, 12, 18, 20];
    const idx = parseInt(text) - 1;
    if (idx >= 0 && idx < counts.length) { const p = getProduct(counts[idx], 'small'); userState[jid].step = 'rec_result'; userState[jid].selectedProduct = p; await send(recResult(p)); }
    else { await send(smallCount()); }
    return;
  }

  if (state.step === 'rec_result') {
    if (text === '1') { userState[jid].step = 'quote1'; await send('📋 *Get a Quote*\n\nStep 1 of 4: Please type your *full name*.'); }
    else if (text === '2') { userState[jid].step = 'waterless'; await send(waterlessList()); }
    else { await send(recResult(state.selectedProduct)); }
    return;
  }

  // FAQ
  if (state.step === 'faq') {
    const keys = ['diff','install','warranty','maintain','delivery','payment','safety'];
    const idx = parseInt(text) - 1;
    if (idx >= 0 && idx < keys.length) { await send(FAQ[keys[idx]] + '\n\n*0* - Main Menu  |  *#* - More FAQs'); }
    else if (text === '#') { await send(faqMenu()); }
    else { await send(faqMenu()); }
    return;
  }

  // QUOTE
  if (state.step === 'quote1') { userState[jid].quoteName = text; userState[jid].step = 'quote2'; await send(`Thank you *${text}*! 😊\n\nStep 2 of 4: How many burners do you have and what type?\n(Example: 3 large daig burners)`); return; }
  if (state.step === 'quote2') { userState[jid].quoteBurners = text; userState[jid].step = 'quote3'; await send(`Step 3 of 4: What type of business do you run?\n\n*1* - Dhaba / Hotel\n*2* - Factory\n*3* - Fast Food\n*4* - Catering\n*5* - Industrial\n*6* - Other`); return; }
  if (state.step === 'quote3') {
    const biz = ['Dhaba / Hotel','Factory','Fast Food','Catering','Industrial','Other'];
    const idx = parseInt(text) - 1;
    userState[jid].quoteBiz = (idx >= 0 && idx < biz.length) ? biz[idx] : text;
    userState[jid].step = 'quote4';
    await send(`Step 4 of 4: Which city are you located in?`);
    return;
  }
  if (state.step === 'quote4') {
    userState[jid].quoteCity = text;
    const q = userState[jid];
    userState[jid].step = 'main';
    await send(`✅ *Thank you, ${q.quoteName}!*\n\n📋 *Your details have been recorded:*\n👤 Name: ${q.quoteName}\n🔥 Burners: ${q.quoteBurners}\n🏢 Business: ${q.quoteBiz}\n📍 City: ${q.quoteCity}\n\nOur representative will contact you soon at *03177271509*! 📞\n\n*0* - 🏠 Main Menu`);
    return;
  }

  await send(mainMenu());
}

// ============================================================
// WHATSAPP CLIENT
// ============================================================

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ],
  }
});

client.on('qr', (qr) => {
  currentQR = qr;
  botStatus = '✅ QR Code Ready! Open the URL to scan.';
  console.log('QR Code generated! Open your Railway URL in browser.');
});

client.on('ready', () => {
  currentQR = null;
  botStatus = '🎉 Bot is LIVE and connected!';
  console.log('🎉 AAA Gas Engineering Bot is LIVE!');
});

client.on('disconnected', (reason) => {
  botStatus = 'Disconnected. Restarting...';
  console.log('Disconnected:', reason);
  client.initialize();
});

client.on('message', async (msg) => {
  try {
    await handleMessage(client, msg);
  } catch (err) {
    console.error('Error:', err);
  }
});

client.initialize();
