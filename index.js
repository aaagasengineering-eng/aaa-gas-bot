const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

// ============================================================
// AAA GAS ENGINEERING - WHATSAPP CHATBOT
// ============================================================

const PRODUCTS = [
  { id: 'W10',  cap: '10 kg/hr',  big: '2 large daig burners',      small: '4 small burners',      price: 'PKR 65,000',   type: 'Water Bath', maxBig: 2,  maxSmall: 4  },
  { id: 'W15',  cap: '15 kg/hr',  big: '2 to 3 large daig burners', small: '4 to 8 small burners',  price: 'PKR 85,000',   type: 'Water Bath', maxBig: 3,  maxSmall: 8  },
  { id: 'W30',  cap: '30 kg/hr',  big: '3 to 6 large daig burners', small: '8 to 12 small burners', price: 'PKR 1,20,000', type: 'Water Bath', maxBig: 6,  maxSmall: 12 },
  { id: 'W50',  cap: '50 kg/hr',  big: '6 to 9 large daig burners', small: '12 to 18 small burners',price: 'PKR 1,95,000', type: 'Water Bath', maxBig: 9,  maxSmall: 18 },
  { id: 'WL30', cap: '30 kg/hr',  big: '3 to 6 large daig burners', small: '8 to 12 small burners', price: 'PKR 2,00,000', type: 'Waterless',  maxBig: 6,  maxSmall: 12 },
  { id: 'WL50', cap: '50 kg/hr',  big: '6 to 9 large daig burners', small: '12 to 18 small burners',price: 'PKR 3,00,000', type: 'Waterless',  maxBig: 9,  maxSmall: 18 },
];

const FAQ = {
  install:  'Our team visits your location for complete installation. We handle pipe fitting, connections, and full safety testing. Done within 1 to 3 days after delivery. ✅',
  warranty: 'Every vaporizer comes with a *1 year warranty* covering both parts and workmanship. Free repair or replacement within warranty period. ✅',
  maintain: 'Annual servicing is recommended. Waterless models require even less maintenance. We also offer Annual Maintenance Contracts (AMC). ✅',
  delivery: 'Delivery completed within *3 to 7 working days* after order confirmation. ✅',
  payment:  'We accept cash, bank transfer, and cheque. For large orders, 50% advance and 50% on delivery terms available. ✅',
  safety:   'All vaporizers include built-in pressure relief valve, thermostat cutoff, and overheat protection. ✅',
  diff:     '*Water Bath Vaporizer:*\nUses water to heat LPG. Affordable and widely used. Available 10kg to 50kg/hr.\n\n*Waterless Vaporizer:*\nUses electricity directly. No water needed. Low maintenance. Available in 30kg and 50kg/hr.',
};

// Store user session state
const userState = {};

// Admin numbers - add your number here to use STOP/START commands
const ADMIN_NUMBERS = ['923177271509'];

// Numbers where bot is stopped by admin
const stoppedNumbers = new Set();

// ============================================================
// MESSAGE BUILDER FUNCTIONS
// ============================================================

function mainMenu() {
  return `👋 *Assalam o Alaikum!*

Welcome to *AAA Gas Engineering!* 🔥

We are specialists in *AAA LPG Vaporizers.*
Water Bath (10 to 50 kg/hr) and Waterless (30 to 50 kg/hr) both available.

Reply with a number:

*1️⃣* Products & Prices
*2️⃣* Recommend a Model for Me
*3️⃣* Water Bath vs Waterless Difference
*4️⃣* FAQs
*5️⃣* Get a Quote / Order
*6️⃣* Contact Us`;
}

function productsMenu() {
  return `📦 *Our LPG Vaporizer Models*

We have 2 types. Which would you like to see?

*1️⃣* 🔵 Water Bath Models (4 models)
*2️⃣* 🟢 Waterless Models (2 models)
*3️⃣* ⚖️ What is the difference?
*0️⃣* 🏠 Main Menu`;
}

function waterBathModels() {
  return `🔵 *Water Bath Vaporizers*

*1️⃣* ⚡ 10 kg/hr — PKR 65,000
*2️⃣* ⚡ 15 kg/hr — PKR 85,000
*3️⃣* ⚡ 30 kg/hr — PKR 1,20,000
*4️⃣* ⚡ 50 kg/hr — PKR 1,95,000
*0️⃣* 🏠 Main Menu

Reply with number to see full details.`;
}

function waterlessModels() {
  return `🟢 *Waterless Vaporizers*

*1️⃣* ⚡ 30 kg/hr — PKR 2,00,000
*2️⃣* ⚡ 50 kg/hr — PKR 3,00,000
*0️⃣* 🏠 Main Menu

Reply with number to see full details.`;
}

function productDetail(p) {
  return `*AAA LPG Vaporizer — ${p.cap}* (${p.type})

🍲 Large daig burners: *${p.big}*
🍳 Small burners (fast food/karahi/Chinese): *${p.small}*
💰 Price: *${p.price}*

✅ Installation included
✅ 1 year warranty

Reply:
*1️⃣* Order This
*2️⃣* See All Models
*0️⃣* Main Menu`;
}

function recommendMenu() {
  return `🔍 *Find the Right Model for You*

What type of burners do you have?

*1️⃣* 🍲 Large daig burners
*2️⃣* 🍳 Small burners (fast food / karahi / Chinese)
*3️⃣* 🔀 Both types
*0️⃣* 🏠 Main Menu`;
}

function bigBurnerCount() {
  return `How many *large daig burners* do you have?

*1️⃣* 1 to 2 burners
*2️⃣* 2 to 3 burners
*3️⃣* 3 to 6 burners
*4️⃣* 6 to 9 burners
*5️⃣* More than 9
*0️⃣* Main Menu`;
}

function smallBurnerCount() {
  return `How many *small burners* do you have?
(fast food / karahi / Chinese stove)

*1️⃣* 1 to 4 burners
*2️⃣* 4 to 8 burners
*3️⃣* 8 to 12 burners
*4️⃣* 12 to 18 burners
*5️⃣* More than 18
*0️⃣* Main Menu`;
}

function recommendResult(p) {
  return `✅ *Best Recommended Model for Your Setup:*

🔥 *AAA LPG Vaporizer ${p.cap}* (${p.type})
🍲 Large daig burners: *${p.big}*
🍳 Small burners: *${p.small}*
💰 Price: *${p.price}*

✅ Installation included | 1 year warranty

💡 If you prefer less maintenance, Waterless option is also available.

Reply:
*1️⃣* Order This
*2️⃣* See Waterless Options
*0️⃣* Main Menu`;
}

function faqMenu() {
  return `❓ *Frequently Asked Questions*

Select your question:

*1️⃣* Water Bath vs Waterless difference
*2️⃣* How is installation done
*3️⃣* Warranty details
*4️⃣* Maintenance requirements
*5️⃣* Delivery time
*6️⃣* Payment terms
*7️⃣* Safety features
*0️⃣* 🏠 Main Menu`;
}

function contactMsg() {
  return `📞 *AAA Gas Engineering*

📱 WhatsApp / Call: *03177271509*
🕐 Available: 9am to 8pm (Monday to Saturday)

You can message us directly on WhatsApp anytime!

*0️⃣* 🏠 Main Menu`;
}

function quoteStep1() {
  return `📋 *Get a Quote*

I need a few details to prepare your quote.

*Step 1 of 4:* Please type your *full name*.`;
}

function getRecommendedProduct(count, type) {
  const filtered = PRODUCTS.filter(p => p.type === 'Water Bath');
  for (const p of filtered) {
    const limit = type === 'big' ? p.maxBig : p.maxSmall;
    if (count <= limit) return p;
  }
  return PRODUCTS[3];
}

// ============================================================
// MAIN MESSAGE HANDLER
// ============================================================

async function handleMessage(sock, msg) {
  const jid = msg.key.remoteJid;
  if (!jid || jid === 'status@broadcast') return;

  const senderNumber = jid.replace('@s.whatsapp.net', '');
  const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
  if (!text) return;

  // ---- ADMIN COMMANDS ----
  if (ADMIN_NUMBERS.includes(senderNumber)) {
    // Format: STOP 923001234567
    if (text.toUpperCase().startsWith('STOP ')) {
      const target = text.split(' ')[1];
      stoppedNumbers.add(target + '@s.whatsapp.net');
      await sock.sendMessage(jid, { text: `✅ Bot stopped for ${target}` });
      return;
    }
    // Format: START 923001234567
    if (text.toUpperCase().startsWith('START ')) {
      const target = text.split(' ')[1];
      stoppedNumbers.delete(target + '@s.whatsapp.net');
      await sock.sendMessage(jid, { text: `✅ Bot started for ${target}` });
      return;
    }
    // STOPALL - stop bot for everyone
    if (text.toUpperCase() === 'STOPALL') {
      userState['GLOBAL_STOP'] = true;
      await sock.sendMessage(jid, { text: '✅ Bot stopped for ALL users.' });
      return;
    }
    // STARTALL - start bot for everyone
    if (text.toUpperCase() === 'STARTALL') {
      userState['GLOBAL_STOP'] = false;
      await sock.sendMessage(jid, { text: '✅ Bot started for ALL users.' });
      return;
    }
  }

  // ---- CHECK IF BOT IS STOPPED ----
  if (userState['GLOBAL_STOP'] === true) return;
  if (stoppedNumbers.has(jid)) return;

  const send = async (message) => {
    await sock.sendMessage(jid, { text: message });
  };

  // ---- GET OR INIT USER STATE ----
  if (!userState[jid]) userState[jid] = { step: 'main' };
  const state = userState[jid];

  // ---- ALWAYS ALLOW 0 = MAIN MENU ----
  if (text === '0') {
    userState[jid] = { step: 'main' };
    await send(mainMenu());
    return;
  }

  // ============================================================
  // STEP MACHINE
  // ============================================================

  // MAIN MENU
  if (state.step === 'main') {
    if (['hi','hello','helo','hey','salam','assalam','start','menu'].includes(text.toLowerCase()) || text === '1' || text === '2' || text === '3' || text === '4' || text === '5' || text === '6') {
      if (text === '1') { userState[jid].step = 'products'; await send(productsMenu()); }
      else if (text === '2') { userState[jid].step = 'recommend'; await send(recommendMenu()); }
      else if (text === '3') { await send(FAQ.diff + '\n\n*0️⃣* Main Menu'); }
      else if (text === '4') { userState[jid].step = 'faq'; await send(faqMenu()); }
      else if (text === '5') { userState[jid].step = 'quote1'; await send(quoteStep1()); }
      else if (text === '6') { await send(contactMsg()); }
      else { await send(mainMenu()); }
    } else {
      await send(mainMenu());
    }
    return;
  }

  // PRODUCTS MENU
  if (state.step === 'products') {
    if (text === '1') { userState[jid].step = 'water_bath'; await send(waterBathModels()); }
    else if (text === '2') { userState[jid].step = 'waterless'; await send(waterlessModels()); }
    else if (text === '3') { await send(FAQ.diff + '\n\n*0️⃣* Main Menu'); }
    else { await send(productsMenu()); }
    return;
  }

  // WATER BATH MODELS
  if (state.step === 'water_bath') {
    const idx = parseInt(text) - 1;
    if (idx >= 0 && idx <= 3) {
      userState[jid].step = 'product_detail';
      userState[jid].selectedProduct = PRODUCTS[idx];
      await send(productDetail(PRODUCTS[idx]));
    } else { await send(waterBathModels()); }
    return;
  }

  // WATERLESS MODELS
  if (state.step === 'waterless') {
    const idx = parseInt(text) - 1;
    if (idx >= 0 && idx <= 1) {
      userState[jid].step = 'product_detail';
      userState[jid].selectedProduct = PRODUCTS[4 + idx];
      await send(productDetail(PRODUCTS[4 + idx]));
    } else { await send(waterlessModels()); }
    return;
  }

  // PRODUCT DETAIL
  if (state.step === 'product_detail') {
    if (text === '1') { userState[jid].step = 'quote1'; await send(quoteStep1()); }
    else if (text === '2') { userState[jid].step = 'products'; await send(productsMenu()); }
    else { await send(productDetail(state.selectedProduct)); }
    return;
  }

  // RECOMMEND MENU
  if (state.step === 'recommend') {
    if (text === '1') { userState[jid].step = 'rec_big'; await send(bigBurnerCount()); }
    else if (text === '2') { userState[jid].step = 'rec_small'; await send(smallBurnerCount()); }
    else if (text === '3') { userState[jid].step = 'rec_small'; await send(smallBurnerCount()); }
    else { await send(recommendMenu()); }
    return;
  }

  // RECOMMEND - BIG BURNERS
  if (state.step === 'rec_big') {
    const counts = [2, 3, 6, 9, 10];
    const idx = parseInt(text) - 1;
    if (idx >= 0 && idx < counts.length) {
      const p = getRecommendedProduct(counts[idx], 'big');
      userState[jid].step = 'rec_result';
      userState[jid].selectedProduct = p;
      await send(recommendResult(p));
    } else { await send(bigBurnerCount()); }
    return;
  }

  // RECOMMEND - SMALL BURNERS
  if (state.step === 'rec_small') {
    const counts = [4, 8, 12, 18, 20];
    const idx = parseInt(text) - 1;
    if (idx >= 0 && idx < counts.length) {
      const p = getRecommendedProduct(counts[idx], 'small');
      userState[jid].step = 'rec_result';
      userState[jid].selectedProduct = p;
      await send(recommendResult(p));
    } else { await send(smallBurnerCount()); }
    return;
  }

  // RECOMMEND RESULT
  if (state.step === 'rec_result') {
    if (text === '1') { userState[jid].step = 'quote1'; await send(quoteStep1()); }
    else if (text === '2') { userState[jid].step = 'waterless'; await send(waterlessModels()); }
    else { await send(recommendResult(state.selectedProduct)); }
    return;
  }

  // FAQ MENU
  if (state.step === 'faq') {
    const faqKeys = ['diff','install','warranty','maintain','delivery','payment','safety'];
    const idx = parseInt(text) - 1;
    if (idx >= 0 && idx < faqKeys.length) {
      await send(FAQ[faqKeys[idx]] + '\n\n*0️⃣* Main Menu  |  *#️⃣* More FAQs');
    } else if (text === '#') {
      await send(faqMenu());
    } else { await send(faqMenu()); }
    return;
  }

  // QUOTE - STEP 1 (Name)
  if (state.step === 'quote1') {
    userState[jid].quoteName = text;
    userState[jid].step = 'quote2';
    await send(`Thank you *${text}*! 😊\n\n*Step 2 of 4:* How many burners do you have and what type?\n(Example: 3 large daig burners, or 8 small karahi burners)`);
    return;
  }

  // QUOTE - STEP 2 (Burners)
  if (state.step === 'quote2') {
    userState[jid].quoteBurners = text;
    userState[jid].step = 'quote3';
    await send(`*Step 3 of 4:* What type of business do you run?\n\n*1️⃣* Dhaba / Hotel\n*2️⃣* Factory\n*3️⃣* Fast Food\n*4️⃣* Catering\n*5️⃣* Industrial\n*6️⃣* Other`);
    return;
  }

  // QUOTE - STEP 3 (Business)
  if (state.step === 'quote3') {
    const bizTypes = ['Dhaba / Hotel', 'Factory', 'Fast Food', 'Catering', 'Industrial', 'Other'];
    const idx = parseInt(text) - 1;
    userState[jid].quoteBiz = (idx >= 0 && idx < bizTypes.length) ? bizTypes[idx] : text;
    userState[jid].step = 'quote4';
    await send(`*Step 4 of 4:* Which city are you located in?`);
    return;
  }

  // QUOTE - STEP 4 (City) — SUBMIT
  if (state.step === 'quote4') {
    userState[jid].quoteCity = text;
    const q = userState[jid];
    userState[jid].step = 'main';
    await send(
`✅ *Thank you, ${q.quoteName}!*

📋 *Your details have been recorded:*
👤 Name: ${q.quoteName}
🔥 Burners: ${q.quoteBurners}
🏢 Business: ${q.quoteBiz}
📍 City: ${q.quoteCity}

Our representative will contact you soon at *03177271509*! 📞

*0️⃣* 🏠 Main Menu`
    );
    return;
  }

  // DEFAULT — show main menu
  await send(mainMenu());
}

// ============================================================
// CONNECT TO WHATSAPP
// ============================================================

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('\n✅ QR Code generated! Scan it with your WhatsApp.\n');
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) connectToWhatsApp();
    } else if (connection === 'open') {
      console.log('\n🎉 AAA Gas Engineering Bot is LIVE!\n');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.key.fromMe && msg.message) {
        try {
          await handleMessage(sock, msg);
        } catch (err) {
          console.error('Error handling message:', err);
        }
      }
    }
  });
}

connectToWhatsApp();
