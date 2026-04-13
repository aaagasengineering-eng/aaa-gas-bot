const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const qrcode = require('qrcode');
const P = require('pino');

// ============================================================
// AAA GAS ENGINEERING - WHATSAPP CHATBOT v4
// ============================================================

const app = express();
let currentQR = null;
let botStatus = 'Starting...';
let isConnected = false;

app.get('/', async (req, res) => {
  if (isConnected) {
    return res.send(`
      <html><head><title>AAA Gas Bot</title><meta http-equiv="refresh" content="10">
      <style>body{font-family:Arial;text-align:center;padding:40px;background:#f0f0f0}
      .box{background:#25D366;color:white;padding:20px 40px;border-radius:12px;display:inline-block;font-size:22px;margin:20px}</style></head>
      <body><h2 style="color:#075E54">🔥 AAA Gas Engineering - WhatsApp Bot</h2>
      <div class="box">🎉 Bot is LIVE and Running!</div>
      <p>Bot is connected and replying to clients automatically.</p>
      <p><small>Page refreshes every 10 seconds</small></p></body></html>
    `);
  }
  if (currentQR) {
    try {
      const qrImage = await qrcode.toDataURL(currentQR);
      return res.send(`
        <html><head><title>AAA Gas Bot - Scan QR</title><meta http-equiv="refresh" content="20">
        <style>body{font-family:Arial;text-align:center;padding:40px;background:#f0f0f0}
        img{border:5px solid #25D366;border-radius:12px;margin:20px}
        h2{color:#075E54}.step{background:#fff;border-radius:8px;padding:12px;margin:8px auto;max-width:400px;text-align:left}</style></head>
        <body>
        <h2>🔥 AAA Gas Engineering - WhatsApp Bot</h2>
        <p style="background:#25D366;color:white;padding:10px 20px;border-radius:8px;display:inline-block">✅ QR Code Ready — Scan Now!</p>
        <br><img src="${qrImage}" width="260" height="260"/><br>
        <div style="max-width:400px;margin:auto">
          <div class="step">1️⃣ Open WhatsApp on your phone</div>
          <div class="step">2️⃣ Tap Settings (3 dots)</div>
          <div class="step">3️⃣ Tap "Linked Devices"</div>
          <div class="step">4️⃣ Tap "Link a Device"</div>
          <div class="step">5️⃣ Scan this QR code</div>
        </div>
        <p><small>⚠️ QR expires in ~20 seconds. Page auto-refreshes.</small></p>
        </body></html>
      `);
    } catch(e) {
      return res.send('<p>Generating QR... Please refresh in 5 seconds.</p>');
    }
  }
  res.send(`
    <html><head><title>AAA Gas Bot</title><meta http-equiv="refresh" content="3">
    <style>body{font-family:Arial;text-align:center;padding:40px;background:#f0f0f0}h2{color:#075E54}</style></head>
    <body><h2>🔥 AAA Gas Engineering - WhatsApp Bot</h2>
    <p style="font-size:18px">⏳ Status: <b>${botStatus}</b></p>
    <p><small>Page auto-refreshes every 3 seconds...</small></p></body></html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Web server running on port', PORT));

// ============================================================
// PRODUCTS & FAQ
// ============================================================

const PRODUCTS = [
  { cap:'10 kg/hr',  big:'2 large daig burners',       small:'4 small burners',        price:'PKR 65,000',   type:'Water Bath', maxBig:2,  maxSmall:4  },
  { cap:'15 kg/hr',  big:'2 to 3 large daig burners',  small:'4 to 8 small burners',   price:'PKR 85,000',   type:'Water Bath', maxBig:3,  maxSmall:8  },
  { cap:'30 kg/hr',  big:'3 to 6 large daig burners',  small:'8 to 12 small burners',  price:'PKR 1,20,000', type:'Water Bath', maxBig:6,  maxSmall:12 },
  { cap:'50 kg/hr',  big:'6 to 9 large daig burners',  small:'12 to 18 small burners', price:'PKR 1,95,000', type:'Water Bath', maxBig:9,  maxSmall:18 },
  { cap:'30 kg/hr',  big:'3 to 6 large daig burners',  small:'8 to 12 small burners',  price:'PKR 2,00,000', type:'Waterless',  maxBig:6,  maxSmall:12 },
  { cap:'50 kg/hr',  big:'6 to 9 large daig burners',  small:'12 to 18 small burners', price:'PKR 3,00,000', type:'Waterless',  maxBig:9,  maxSmall:18 },
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
const ADMIN_NUMBER = '923177271509';
const stoppedNumbers = new Set();

// ============================================================
// MESSAGE TEMPLATES
// ============================================================

const mainMenu = () => `👋 *Assalam o Alaikum!*

Welcome to *AAA Gas Engineering!* 🔥

We are specialists in *AAA LPG Vaporizers.*
Water Bath (10-50 kg/hr) and Waterless (30-50 kg/hr) both available.

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
🕐 Available: 9am to 8pm (Mon-Sat)

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

async function handleMessage(sock, jid, text) {
  const send = async (msg) => {
    await sock.sendMessage(jid, { text: msg });
  };

  // ADMIN COMMANDS
  if (jid.includes(ADMIN_NUMBER)) {
    if (text.toUpperCase().startsWith('STOP ')) {
      const t = text.split(' ')[1] + '@s.whatsapp.net';
      stoppedNumbers.add(t);
      await send('✅ Bot stopped for ' + text.split(' ')[1]);
      return;
    }
    if (text.toUpperCase().startsWith('START ')) {
      const t = text.split(' ')[1] + '@s.whatsapp.net';
      stoppedNumbers.delete(t);
      await send('✅ Bot started for ' + text.split(' ')[1]);
      return;
    }
    if (text.toUpperCase() === 'STOPALL') { userState['GLOBAL_STOP'] = true; await send('✅ Bot stopped for ALL.'); return; }
    if (text.toUpperCase() === 'STARTALL') { userState['GLOBAL_STOP'] = false; await send('✅ Bot started for ALL.'); return; }
  }

  if (userState['GLOBAL_STOP']) return;
  if (stoppedNumbers.has(jid)) return;
  if (!userState[jid]) userState[jid] = { step: 'main' };
  const s = userState[jid];

  if (text === '0') { userState[jid] = { step: 'main' }; await send(mainMenu()); return; }

  // MAIN
  if (s.step === 'main') {
    const greet = ['hi','hello','hey','salam','assalam','start','menu','hii','hlw','helo','assalamualaikum'];
    if (greet.includes(text.toLowerCase())) { await send(mainMenu()); return; }
    if (text==='1'){s.step='products';await send(productsMenu());}
    else if(text==='2'){s.step='recommend';await send(recommendMenu());}
    else if(text==='3'){await send(FAQ.diff+'\n\n*0* - Main Menu');}
    else if(text==='4'){s.step='faq';await send(faqMenu());}
    else if(text==='5'){s.step='quote1';await send('📋 *Get a Quote*\n\nStep 1 of 4: Please type your *full name*.');}
    else if(text==='6'){await send(contactMsg());}
    else{await send(mainMenu());}
    return;
  }

  // PRODUCTS
  if (s.step==='products'){
    if(text==='1'){s.step='water_bath';await send(waterBathList());}
    else if(text==='2'){s.step='waterless';await send(waterlessList());}
    else if(text==='3'){await send(FAQ.diff+'\n\n*0* - Main Menu');}
    else{await send(productsMenu());}
    return;
  }

  if (s.step==='water_bath'){
    const i=parseInt(text)-1;
    if(i>=0&&i<=3){s.step='product_detail';s.selectedProduct=PRODUCTS[i];await send(productDetail(PRODUCTS[i]));}
    else{await send(waterBathList());}
    return;
  }

  if (s.step==='waterless'){
    const i=parseInt(text)-1;
    if(i>=0&&i<=1){s.step='product_detail';s.selectedProduct=PRODUCTS[4+i];await send(productDetail(PRODUCTS[4+i]));}
    else{await send(waterlessList());}
    return;
  }

  if (s.step==='product_detail'){
    if(text==='1'){s.step='quote1';await send('📋 *Get a Quote*\n\nStep 1 of 4: Please type your *full name*.');}
    else if(text==='2'){s.step='products';await send(productsMenu());}
    else{await send(productDetail(s.selectedProduct));}
    return;
  }

  // RECOMMEND
  if (s.step==='recommend'){
    if(text==='1'){s.step='rec_big';await send(bigCount());}
    else if(text==='2'||text==='3'){s.step='rec_small';await send(smallCount());}
    else{await send(recommendMenu());}
    return;
  }

  if (s.step==='rec_big'){
    const counts=[2,3,6,9,10];
    const i=parseInt(text)-1;
    if(i>=0&&i<counts.length){const p=getProduct(counts[i],'big');s.step='rec_result';s.selectedProduct=p;await send(recResult(p));}
    else{await send(bigCount());}
    return;
  }

  if (s.step==='rec_small'){
    const counts=[4,8,12,18,20];
    const i=parseInt(text)-1;
    if(i>=0&&i<counts.length){const p=getProduct(counts[i],'small');s.step='rec_result';s.selectedProduct=p;await send(recResult(p));}
    else{await send(smallCount());}
    return;
  }

  if (s.step==='rec_result'){
    if(text==='1'){s.step='quote1';await send('📋 *Get a Quote*\n\nStep 1 of 4: Please type your *full name*.');}
    else if(text==='2'){s.step='waterless';await send(waterlessList());}
    else{await send(recResult(s.selectedProduct));}
    return;
  }

  // FAQ
  if (s.step==='faq'){
    const keys=['diff','install','warranty','maintain','delivery','payment','safety'];
    const i=parseInt(text)-1;
    if(i>=0&&i<keys.length){await send(FAQ[keys[i]]+'\n\n*0* - Main Menu  |  *#* - More FAQs');}
    else if(text==='#'){await send(faqMenu());}
    else{await send(faqMenu());}
    return;
  }

  // QUOTE
  if(s.step==='quote1'){s.quoteName=text;s.step='quote2';await send(`Thank you *${text}*! 😊\n\nStep 2 of 4: How many burners do you have and what type?\n(Example: 3 large daig burners)`);return;}
  if(s.step==='quote2'){s.quoteBurners=text;s.step='quote3';await send('Step 3 of 4: What type of business?\n\n*1* - Dhaba / Hotel\n*2* - Factory\n*3* - Fast Food\n*4* - Catering\n*5* - Industrial\n*6* - Other');return;}
  if(s.step==='quote3'){
    const biz=['Dhaba / Hotel','Factory','Fast Food','Catering','Industrial','Other'];
    const i=parseInt(text)-1;
    s.quoteBiz=(i>=0&&i<biz.length)?biz[i]:text;
    s.step='quote4';
    await send('Step 4 of 4: Which city are you located in?');
    return;
  }
  if(s.step==='quote4'){
    s.quoteCity=text;
    s.step='main';
    await send(`✅ *Thank you, ${s.quoteName}!*\n\n📋 *Your details recorded:*\n👤 Name: ${s.quoteName}\n🔥 Burners: ${s.quoteBurners}\n🏢 Business: ${s.quoteBiz}\n📍 City: ${s.quoteCity}\n\nOur representative will contact you soon at *03177271509*! 📞\n\n*0* - 🏠 Main Menu`);
    return;
  }

  await send(mainMenu());
}

// ============================================================
// WHATSAPP CONNECTION
// ============================================================

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })),
    },
    logger: P({ level: 'silent' }),
    browser: ['AAA Gas Bot', 'Safari', '1.0'],
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      currentQR = qr;
      isConnected = false;
      botStatus = 'QR Code Ready! Open URL to scan.';
      console.log('✅ QR ready! Open Railway URL in browser.');
    }
    if (connection === 'open') {
      currentQR = null;
      isConnected = true;
      botStatus = '🎉 Bot is LIVE!';
      console.log('🎉 Bot is LIVE!');
    }
    if (connection === 'close') {
      isConnected = false;
      currentQR = null;
      botStatus = 'Reconnecting...';
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log('Connection closed, code:', code);
      if (code !== DisconnectReason.loggedOut) {
        setTimeout(startBot, 3000);
      } else {
        botStatus = 'Logged out. Please redeploy.';
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (!msg.message) continue;
      const jid = msg.key.remoteJid;
      if (!jid || jid === 'status@broadcast') continue;
      const text = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        ''
      ).trim();
      if (!text) continue;
      try {
        await handleMessage(sock, jid, text);
      } catch (e) {
        console.error('Message error:', e.message);
      }
    }
  });
}

startBot();
