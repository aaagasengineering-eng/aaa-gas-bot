const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');
const qrcode = require('qrcode');

// ============================================================
// AAA GAS ENGINEERING - WHATSAPP CHATBOT v2
// ============================================================

let currentQR = null;
let botStatus = 'Waiting for QR scan...';

// QR Web Server — open this in browser to scan QR
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  if (currentQR) {
    const qrImage = await qrcode.toDataURL(currentQR);
    res.end(`
      <html>
        <head>
          <title>AAA Gas Bot - Scan QR</title>
          <meta http-equiv="refresh" content="10">
          <style>
            body { font-family: Arial; text-align: center; padding: 40px; background: #f0f0f0; }
            img { border: 4px solid #25D366; border-radius: 12px; }
            h2 { color: #075E54; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <h2>AAA Gas Engineering - WhatsApp Bot</h2>
          <p>Open WhatsApp → Settings → Linked Devices → Link a Device</p>
          <p>Then scan this QR code:</p>
          <img src="${qrImage}" width="300" height="300"/>
          <p><small>Page auto-refreshes every 10 seconds</small></p>
        </body>
      </html>
    `);
  } else {
    res.end(`
      <html>
        <head>
          <title>AAA Gas Bot</title>
          <meta http-equiv="refresh" content="5">
          <style>
            body { font-family: Arial; text-align: center; padding: 40px; background: #f0f0f0; }
            h2 { color: #075E54; }
          </style>
        </head>
        <body>
          <h2>AAA Gas Engineering - WhatsApp Bot</h2>
          <p>Status: <b>${botStatus}</b></p>
          <p><small>Page auto-refreshes every 5 seconds</small></p>
        </body>
      </html>
    `);
  }
});

server.listen(process.env.PORT || 3000, () => {
  console.log('QR Web Server running on port', process.env.PORT || 3000);
});

// ============================================================
// PRODUCTS & FAQ DATA
// ============================================================

const PRODUCTS = [
  { id: 'W10',  cap: '10 kg/hr',  big: '2 large daig burners',      small: '4 small burners',       price: 'PKR 65,000',   type: 'Water Bath', maxBig: 2,  maxSmall: 4  },
  { id: 'W15',  cap: '15 kg/hr',  big: '2 to 3 large daig burners', small: '4 to 8 small burners',  price: 'PKR 85,000',   type: 'Water Bath', maxBig: 3,  maxSmall: 8  },
  { id: 'W30',  cap: '30 kg/hr',  big: '3 to 6 large daig burners', small: '8 to 12 small burners', price: 'PKR 1,20,000', type: 'Water Bath', maxBig: 6,  maxSmall: 12 },
  { id: 'W50',  cap: '50 kg/hr',  big: '6 to 9 large daig burners', small: '12 to 18 small burners',price: 'PKR 1,95,000', type: 'Water Bath', maxBig: 9,  maxSmall: 18 },
  { id: 'WL30', cap: '30 kg/hr',  big: '3 to 6 large daig burners', small: '8 to 12 small burners', price: 'PKR 2,00,000', type: 'Waterless',  maxBig: 6,  maxSmall: 12 },
  { id: 'WL50', cap: '50 kg/hr',  big: '6 to 9 large daig burners', small: '12 to 18 small burners',price: 'PKR 3,00,000', type: 'Waterless',  maxBig: 9,  maxSmall: 18 },
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
const ADMIN_NUMBERS = ['923177271509'];
const stoppedNumbers = new Set();

// ============================================================
// MESSAGE TEMPLATES
// ============================================================

function mainMenu() {
  return `👋 *Assalam o Alaikum!*

Welcome to *AAA Gas Engineering!* 🔥

We are specialists in *AAA LPG Vaporizers.*
Water Bath (10–50 kg/hr) and Waterless (30–50 kg/hr) both available.

Reply with a number:

*1* - Products & Prices
*2* - Recommend a Model for Me
*3* - Water Bath vs Waterless Difference
*4* - FAQs
*5* - Get a Quote / Order
*6* - Contact Us`;
}

function productsMenu() {
  return `📦 *Our LPG Vaporizer Models*

*1* - 🔵 Water Bath Models (4 models)
*2* - 🟢 Waterless Models (2 models)
*3* - ⚖️ What is the difference?
*0* - 🏠 Main Menu`;
}

function waterBathList() {
  return `🔵 *Water Bath Vaporizers*

*1* - 10 kg/hr — PKR 65,000
*2* - 15 kg/hr — PKR 85,000
*3* - 30 kg/hr — PKR 1,20,000
*4* - 50 kg/hr — PKR 1,95,000
*0* - 🏠 Main Menu`;
}

function waterlessList() {
  return `🟢 *Waterless Vaporizers*

*1* - 30 kg/hr — PKR 2,00,000
*2* - 50 kg/hr — PKR 3,00,000
*0* - 🏠 Main Menu`;
}

function productDetail(p) {
  return `*AAA LPG Vaporizer — ${p.cap}* (${p.type})

🍲 Large daig burners: *${p.big}*
🍳 Small burners (fast food/karahi/Chinese): *${p.small}*
💰 Price: *${p.price}*

✅ Installation included
✅ 1 year warranty

*1* - Order This
*2* - See All Models
*0* - Main Menu`;
}

function recommendMenu() {
  return `🔍 *Find the Right Model for You*

What type of burners do you have?

*1* - 🍲 Large daig burners
*2* - 🍳 Small burners (fast food/karahi/Chinese)
*3* - 🔀 Both types
*0* - 🏠 Main Menu`;
}

function bigBurnerCount() {
  return `How many *large daig burners* do you have?

*1* - 1 to 2 burners
*2* - 2 to 3 burners
*3* - 3 to 6 burners
*4* - 6 to 9 burners
*5* - More than 9
*0* - Main Menu`;
}

function smallBurnerCount() {
  return `How many *small burners* do you have?
(fast food / karahi / Chinese stove)

*1* - 1 to 4 burners
*2* - 4 to 8 burners
*3* - 8 to 12 burners
*4* - 12 to 18 burners
*5* - More than 18
*0* - Main Menu`;
}

function recommendResult(p) {
  return `✅ *Best Recommended Model for Your Setup:*

🔥 *AAA LPG Vaporizer ${p.cap}* (${p.type})
🍲 Large daig burners: *${p.big}*
🍳 Small burners: *${p.small}*
💰 Price: *${p.price}*

✅ Installation included | 1 year warranty

*1* - Order This
*2* - See Waterless Options
*0* - Main Menu`;
}

function faqMenu() {
  return `❓ *Frequently Asked Questions*

*1* - Water Bath vs Waterless difference
*2* - How is installation done
*3* - Warranty details
*4* - Maintenance requirements
*5* - Delivery time
*6* - Payment terms
*7* - Safety features
*0* - 🏠 Main Menu`;
}

function contactMsg() {
  return `📞 *AAA Gas Engineering*

📱 WhatsApp / Call: *03177271509*
🕐 Available: 9am to 8pm (Mon–Sat)

You can message us directly on WhatsApp anytime!

*0* - 🏠 Main Menu`;
}

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

async function handleMessage(sock, msg) {
  const jid = msg.key.remoteJid;
  if (!jid || jid === 'status@broadcast') return;

  const senderNumber = jid.replace('@s.whatsapp.net', '');
  const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
  if (!text) return;

  const send = async (message) => {
    await sock.sendMessage(jid, { text: message });
  };

  // ---- ADMIN COMMANDS ----
  if (ADMIN_NUMBERS.includes(senderNumber)) {
    if (text.toUpperCase().startsWith('STOP ')) {
      const target = text.split(' ')[1];
      stoppedNumbers.add(target + '@s.whatsapp.net');
      await send(`✅ Bot stopped for ${target}`);
      return;
    }
    if (text.toUpperCase().startsWith('START ')) {
      const target = text.split(' ')[1];
      stoppedNumbers.delete(target + '@s.whatsapp.net');
      await send(`✅ Bot started for ${target}`);
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

  // ---- STOP CHECKS ----
  if (userState['GLOBAL_STOP'] === true) return;
  if (stoppedNumbers.has(jid)) return;

  // ---- INIT STATE ----
  if (!userState[jid]) userState[jid] = { step: 'main' };
  const state = userState[jid];

  // 0 always goes to main menu
  if (text === '0') {
    userState[jid] = { step: 'main' };
    await send(mainMenu());
    return;
  }

  // MAIN MENU
  if (state.step === 'main') {
    const greetings = ['hi','hello','helo','hey','salam','assalam','start','menu','hii','hlw'];
    if (greetings.includes(text.toLowerCase())) {
      await send(mainMenu()); return;
    }
    if (text === '1') { userState[jid].step = 'products'; await send(productsMenu()); }
    else if (text === '2') { userState[jid].step = 'recommend'; await send(recommendMenu()); }
    else if (text === '3') { await send(FAQ.diff + '\n\n*0* - Main Menu'); }
    else if (text === '4') { userState[jid].step = 'faq'; await send(faqMenu()); }
    else if (text === '5') { userState[jid].step = 'quote1'; await send(`📋 *Get a Quote*\n\nStep 1 of 4: Please type your *full name*.`); }
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

  // WATER BATH LIST
  if (state.step === 'water_bath') {
    const idx = parseInt(text) - 1;
    if (idx >= 0 && idx <= 3) {
      userState[jid].step = 'product_detail';
      userState[jid].selectedProduct = PRODUCTS[idx];
      await send(productDetail(PRODUCTS[idx]));
    } else { await send(waterBathList()); }
    return;
  }

  // WATERLESS LIST
  if (state.step === 'waterless') {
    const idx = parseInt(text) - 1;
    if (idx >= 0 && idx <= 1) {
      userState[jid].step = 'product_detail';
      userState[jid].selectedProduct = PRODUCTS[4 + idx];
      await send(productDetail(PRODUCTS[4 + idx]));
    } else { await send(waterlessList()); }
    return;
  }

  // PRODUCT DETAIL
  if (state.step === 'product_detail') {
    if (text === '1') { userState[jid].step = 'quote1'; await send(`📋 *Get a Quote*\n\nStep 1 of 4: Please type your *full name*.`); }
    else if (text === '2') { userState[jid].step = 'products'; await send(productsMenu()); }
    else { await send(productDetail(state.selectedProduct)); }
    return;
  }

  // RECOMMEND
  if (state.step === 'recommend') {
    if (text === '1') { userState[jid].step = 'rec_big'; await send(bigBurnerCount()); }
    else if (text === '2') { userState[jid].step = 'rec_small'; await send(smallBurnerCount()); }
    else if (text === '3') { userState[jid].step = 'rec_small'; await send(smallBurnerCount()); }
    else { await send(recommendMenu()); }
    return;
  }

  if (state.step === 'rec_big') {
    const counts = [2, 3, 6, 9, 10];
    const idx = parseInt(text) - 1;
    if (idx >= 0 && idx < counts.length) {
      const p = getProduct(counts[idx], 'big');
      userState[jid].step = 'rec_result';
      userState[jid].selectedProduct = p;
      await send(recommendResult(p));
    } else { await send(bigBurnerCount()); }
    return;
  }

  if (state.step === 'rec_small') {
    const counts = [4, 8, 12, 18, 20];
    const idx = parseInt(text) - 1;
    if (idx >= 0 && idx < counts.length) {
      const p = getProduct(counts[idx], 'small');
      userState[jid].step = 'rec_result';
      userState[jid].selectedProduct = p;
      await send(recommendResult(p));
    } else { await send(smallBurnerCount()); }
    return;
  }

  if (state.step === 'rec_result') {
    if (text === '1') { userState[jid].step = 'quote1'; await send(`📋 *Get a Quote*\n\nStep 1 of 4: Please type your *full name*.`); }
    else if (text === '2') { userState[jid].step = 'waterless'; await send(waterlessList()); }
    else { await send(recommendResult(state.selectedProduct)); }
    return;
  }

  // FAQ
  if (state.step === 'faq') {
    const keys = ['diff','install','warranty','maintain','delivery','payment','safety'];
    const idx = parseInt(text) - 1;
    if (idx >= 0 && idx < keys.length) {
      await send(FAQ[keys[idx]] + '\n\n*0* - Main Menu  |  *#* - More FAQs');
    } else if (text === '#') {
      await send(faqMenu());
    } else { await send(faqMenu()); }
    return;
  }

  // QUOTE FLOW
  if (state.step === 'quote1') {
    userState[jid].quoteName = text;
    userState[jid].step = 'quote2';
    await send(`Thank you *${text}*! 😊\n\nStep 2 of 4: How many burners do you have and what type?\n(Example: 3 large daig burners)`);
    return;
  }

  if (state.step === 'quote2') {
    userState[jid].quoteBurners = text;
    userState[jid].step = 'quote3';
    await send(`Step 3 of 4: What type of business do you run?\n\n*1* - Dhaba / Hotel\n*2* - Factory\n*3* - Fast Food\n*4* - Catering\n*5* - Industrial\n*6* - Other`);
    return;
  }

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
    await send(`✅ *Thank you, ${q.quoteName}!*

📋 *Your details have been recorded:*
👤 Name: ${q.quoteName}
🔥 Burners: ${q.quoteBurners}
🏢 Business: ${q.quoteBiz}
📍 City: ${q.quoteCity}

Our representative will contact you soon at *03177271509*! 📞

*0* - 🏠 Main Menu`);
    return;
  }

  await send(mainMenu());
}

// ============================================================
// WHATSAPP CONNECTION
// ============================================================

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['AAA Gas Bot', 'Chrome', '1.0.0'],
    connectTimeoutMs: 60000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = qr;
      botStatus = 'QR Code ready! Open the web URL to scan.';
      console.log('✅ QR Code ready! Open your Railway URL in browser to scan.');
    }

    if (connection === 'close') {
      currentQR = null;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) connectToWhatsApp();
    } else if (connection === 'open') {
      currentQR = null;
      botStatus = '🎉 Bot is LIVE and connected!';
      console.log('🎉 AAA Gas Engineering Bot is LIVE!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.key.fromMe && msg.message) {
        try {
          await handleMessage(sock, msg);
        } catch (err) {
          console.error('Error:', err);
        }
      }
    }
  });
}

connectToWhatsApp();
