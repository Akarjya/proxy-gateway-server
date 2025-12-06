/**
 * Posts Data - All 5 blog posts content
 * Hindi (pure Devanagari) + English versions
 * 
 * IMAGE FIELD GUIDE:
 * ==================
 * To add a custom featured image to any post:
 * 1. Add an 'image' field with the full URL to the image
 * 2. Recommended image size: 1200x630px (for social sharing)
 * 3. You can use any image hosting service like:
 *    - Imgur: https://imgur.com/upload
 *    - ImgBB: https://imgbb.com/
 *    - Cloudinary: https://cloudinary.com/
 *    - Put image in public/images folder: /images/your-image.jpg
 * 4. If no image is provided, gradient background will be shown
 * 
 * Example:
 *   image: 'https://i.imgur.com/abc123.jpg',
 *   OR
 *   image: '/images/dating-apps.jpg',
 */

const posts = {
  
  // ============================================
  // POST 1: Best Dating Apps
  // ============================================
  'best-dating-apps': {
    slug: 'best-dating-apps',
    emoji: '💘',
    image: '/images/featured.jpg',
    title: {
      hi: '🔥 भारत में बेस्ट डेटिंग ऐप्स 2025 — Tinder, Bumble और अन्य',
      en: '🔥 Best Dating Apps in India 2025 — Tinder, Bumble & More'
    },
    imageText: {
      hi: 'इस App में 5 मिनट में GF बनाओ!',
      en: 'Find Your Match in 5 Minutes!'
    },
    metaDesc: 'Best dating apps in India 2025. Complete review of Tinder, Bumble, Hinge, Aisle and more.',
    content: `
      <p class="lang-hi">क्या आप भी अपने लिए परफेक्ट पार्टनर ढूंढ रहे हैं? 2025 में डेटिंग ऐप्स ने प्यार ढूंढना बहुत आसान बना दिया है। लेकिन सवाल यह है कि कौन सा ऐप आपके लिए सबसे अच्छा है? 💖📱</p>
      <p class="lang-en">Looking for your perfect partner? Dating apps in 2025 have made finding love easier than ever. But the question is - which app is best for you? 💖📱</p>

      <h2>🔥 Tinder — स्वाइप, मैच, स्पार्क ❤️</h2>
      
      <p class="lang-hi"><strong>Tinder</strong> दुनिया का सबसे पॉपुलर डेटिंग ऐप है। इसका स्वाइप राइट फीचर बहुत आसान और मजेदार है। भारत में लाखों लोग इसे रोज़ाना इस्तेमाल करते हैं।</p>
      <p class="lang-en"><strong>Tinder</strong> is the world's most popular dating app. Its swipe right feature is easy and fun. Millions of people in India use it daily.</p>

      <ul>
        <li class="lang-hi">💘 सिंपल स्वाइप, इंस्टेंट मैच</li>
        <li class="lang-en">💘 Simple swipes, instant matches</li>
        <li class="lang-hi">🌍 Passport फीचर से दुनिया भर में मैच करें</li>
        <li class="lang-en">🌍 Match worldwide with Passport feature</li>
        <li class="lang-hi">🎯 AI-Powered Smart Picks</li>
        <li class="lang-en">🎯 AI-Powered Smart Picks</li>
        <li class="lang-hi">💎 Premium में देखें किसने आपको Like किया</li>
        <li class="lang-en">💎 See who liked you with premium</li>
      </ul>

      <div class="highlight-box">
        <p class="lang-hi">💡 <strong>Pro Tip:</strong> Tinder Gold लेने से पहले 1 हफ्ता फ्री वर्जन यूज़ करें। अगर अच्छे मैच आ रहे हैं तभी पैसे लगाएं।</p>
        <p class="lang-en">💡 <strong>Pro Tip:</strong> Use the free version for a week before buying Tinder Gold. Only pay if you're getting good matches.</p>
      </div>

      <h2>💛 Bumble — लड़कियां करती हैं पहले मैसेज 👑</h2>
      
      <p class="lang-hi"><strong>Bumble</strong> में एक खास बात है - यहां लड़कियां पहले मैसेज करती हैं। इससे आपको fake profiles और spam से बचाव मिलता है। यह ऐप सेफ्टी को प्राथमिकता देता है।</p>
      <p class="lang-en"><strong>Bumble</strong> has a unique feature - women message first here. This protects you from fake profiles and spam. This app prioritizes safety.</p>

      <ul>
        <li class="lang-hi">🌸 महिलाएं भेजती हैं पहला मैसेज</li>
        <li class="lang-en">🌸 Women send the first message</li>
        <li class="lang-hi">🧠 BFF और Bizz मोड भी है</li>
        <li class="lang-en">🧠 BFF and Bizz modes available too</li>
        <li class="lang-hi">💬 बिल्ट-इन वॉइस/वीडियो कॉल</li>
        <li class="lang-en">💬 Built-in voice/video calls</li>
        <li class="lang-hi">🛡️ वेरिफाइड प्रोफाइल्स</li>
        <li class="lang-en">🛡️ Verified profiles</li>
      </ul>

      <h2>💖 Hinge — सीरियस रिलेशनशिप के लिए 💍</h2>
      
      <p class="lang-hi"><strong>Hinge</strong> का टैगलाइन है "Designed to be Deleted" यानी यह ऐप सीरियस रिलेशनशिप के लिए बना है। यहां लोग टाइमपास नहीं, बल्कि लॉन्ग-टर्म पार्टनर ढूंढते हैं।</p>
      <p class="lang-en"><strong>Hinge</strong> is "Designed to be Deleted" - meaning it's made for serious relationships. People here look for long-term partners, not timepass.</p>

      <ul>
        <li class="lang-hi">💬 Personality Prompts से गहरी बातचीत</li>
        <li class="lang-en">💬 Deep conversations with Personality Prompts</li>
        <li class="lang-hi">🧠 स्मार्ट रिकमेंडेशन</li>
        <li class="lang-en">🧠 Smart recommendations</li>
        <li class="lang-hi">🔄 "Your Turn" रिमाइंडर</li>
        <li class="lang-en">🔄 "Your Turn" reminders</li>
        <li class="lang-hi">💍 रिलेशनशिप-ओरिएंटेड कम्युनिटी</li>
        <li class="lang-en">💍 Relationship-oriented community</li>
      </ul>

      <h2>🇮🇳 Aisle — भारतीयों के लिए बना 🪷</h2>
      
      <p class="lang-hi"><strong>Aisle</strong> खासतौर पर भारतीय ऑडियंस के लिए बनाया गया है। यहां ज्यादातर लोग शादी या सीरियस रिलेशनशिप ढूंढते हैं। Profile verification बहुत strict है।</p>
      <p class="lang-en"><strong>Aisle</strong> is made specifically for Indian audience. Most people here look for marriage or serious relationships. Profile verification is very strict.</p>

      <ul>
        <li class="lang-hi">🇮🇳 भारतीय कल्चर को समझता है</li>
        <li class="lang-en">🇮🇳 Understands Indian culture</li>
        <li class="lang-hi">💍 मैट्रिमोनी + डेटिंग का मिक्स</li>
        <li class="lang-en">💍 Mix of matrimony + dating</li>
        <li class="lang-hi">✓ Strict verification process</li>
        <li class="lang-en">✓ Strict verification process</li>
        <li class="lang-hi">👨‍👩‍👧 Family values को importance</li>
        <li class="lang-en">👨‍👩‍👧 Importance to family values</li>
      </ul>

      <h2>🌹 TrulyMadly — Trust Score वाला ऐप</h2>
      
      <p class="lang-hi"><strong>TrulyMadly</strong> में हर प्रोफाइल का Trust Score होता है। जितना ज्यादा verification, उतना ज्यादा score। इससे fake profiles से बचना आसान हो जाता है।</p>
      <p class="lang-en"><strong>TrulyMadly</strong> has a Trust Score for every profile. More verification means higher score. This makes it easier to avoid fake profiles.</p>

      <h2>💡 कौन सा ऐप चुनें?</h2>
      
      <ul>
        <li class="lang-hi">😄 कैजुअल डेटिंग के लिए: <strong>Tinder</strong></li>
        <li class="lang-en">😄 For casual dating: <strong>Tinder</strong></li>
        <li class="lang-hi">👑 सेफ्टी पहले: <strong>Bumble</strong></li>
        <li class="lang-en">👑 Safety first: <strong>Bumble</strong></li>
        <li class="lang-hi">💍 सीरियस रिलेशनशिप: <strong>Hinge</strong></li>
        <li class="lang-en">💍 Serious relationship: <strong>Hinge</strong></li>
        <li class="lang-hi">🇮🇳 भारतीय वैल्यूज: <strong>Aisle</strong></li>
        <li class="lang-en">🇮🇳 Indian values: <strong>Aisle</strong></li>
      </ul>

      <div class="tip-box">
        <p class="lang-hi">✅ <strong>सलाह:</strong> एक साथ 2-3 ऐप्स यूज़ करें। इससे आपके मैच होने के चांस बढ़ जाते हैं!</p>
        <p class="lang-en">✅ <strong>Advice:</strong> Use 2-3 apps together. This increases your chances of matching!</p>
      </div>

      <h2>🧿 ऑनलाइन डेटिंग में सेफ्टी टिप्स</h2>
      
      <ul>
        <li class="lang-hi">🚫 पर्सनल डिटेल्स जल्दी शेयर न करें</li>
        <li class="lang-en">🚫 Don't share personal details too quickly</li>
        <li class="lang-hi">📸 प्रोफाइल को ऐप में वेरिफाई करें</li>
        <li class="lang-en">📸 Verify profiles in-app</li>
        <li class="lang-hi">💬 नंबर देने से पहले ऐप में ही चैट करें</li>
        <li class="lang-en">💬 Chat in-app before sharing numbers</li>
        <li class="lang-hi">🏙️ पहली मीटिंग पब्लिक प्लेस में करें</li>
        <li class="lang-en">🏙️ Meet first in public places</li>
        <li class="lang-hi">🧠 अपनी इंस्टिंक्ट पर भरोसा करें</li>
        <li class="lang-en">🧠 Trust your instincts</li>
      </ul>

      <div class="warning-box">
        <p class="lang-hi">⚠️ <strong>सावधान:</strong> कभी भी पैसे या बैंक डिटेल्स किसी को न दें। यह स्कैम हो सकता है!</p>
        <p class="lang-en">⚠️ <strong>Warning:</strong> Never give money or bank details to anyone. This could be a scam!</p>
      </div>

      <p class="lang-hi">अब जब आपको पता चल गया कि कौन सा ऐप बेस्ट है, तो अगला स्टेप है एक परफेक्ट प्रोफाइल बनाना। क्योंकि बिना अच्छी प्रोफाइल के मैच मिलना मुश्किल है! 💕</p>
      <p class="lang-en">Now that you know which app is best, the next step is creating a perfect profile. Because without a good profile, getting matches is difficult! 💕</p>
    `,
    relatedPosts: [
      { slug: 'dating-profile-tips', emoji: '📸', title: { hi: 'परफेक्ट डेटिंग प्रोफाइल कैसे बनाएं?', en: 'How to Create Perfect Dating Profile?' } },
      { slug: 'first-date-tips', emoji: '🌹', title: { hi: 'फर्स्ट डेट टिप्स', en: 'First Date Tips' } }
    ],
    nextPost: {
      slug: 'first-date-tips',
      title: { hi: 'फर्स्ट डेट टिप्स', en: 'First Date Tips' },
      teaser: { hi: 'मैच हो गया? अब जानिए पहली डेट को परफेक्ट कैसे बनाएं...', en: 'Got a match? Now learn how to make your first date perfect...' }
    }
  },

  // ============================================
  // POST 2: First Date Tips
  // ============================================
  'first-date-tips': {
    slug: 'first-date-tips',
    emoji: '🌹',
    image: '/images/featured.jpg',
    title: {
      hi: '🌹 फर्स्ट डेट टिप्स — उसे इम्प्रेस कैसे करें?',
      en: '🌹 First Date Tips — How to Impress Her?'
    },
    imageText: {
      hi: 'पहली Date पर कैसे Impress करें?',
      en: 'How to Impress on First Date?'
    },
    metaDesc: 'First date tips for Indian men. What to do, what not to do, conversation tips and more.',
    content: `
      <p class="lang-hi">पहली डेट! सोचते ही दिल की धड़कन तेज़ हो जाती है। क्या पहनें? क्या बोलें? कहां जाएं? टेंशन मत लो, इस गाइड में सब कुछ बताऊंगा। 💖</p>
      <p class="lang-en">First date! Just thinking about it makes your heart beat faster. What to wear? What to say? Where to go? Don't worry, I'll tell you everything in this guide. 💖</p>

      <h2>👔 क्या पहनें? — ड्रेसिंग टिप्स</h2>
      
      <p class="lang-hi">पहला इम्प्रेशन बहुत ज़रूरी है। आपकी ड्रेसिंग से पता चलता है कि आप कितना एफर्ट डाल रहे हैं।</p>
      <p class="lang-en">First impression is very important. Your dressing shows how much effort you're putting in.</p>

      <ul>
        <li class="lang-hi">👕 साफ-सुथरे और इस्त्री किए कपड़े पहनें</li>
        <li class="lang-en">👕 Wear clean and ironed clothes</li>
        <li class="lang-hi">👟 जूते साफ होने चाहिए (लड़कियां नोटिस करती हैं!)</li>
        <li class="lang-en">👟 Shoes should be clean (girls notice!)</li>
        <li class="lang-hi">🧴 हल्का परफ्यूम लगाएं, ज्यादा नहीं</li>
        <li class="lang-en">🧴 Use light perfume, not too much</li>
        <li class="lang-hi">💈 बाल और दाढ़ी ट्रिम करके जाएं</li>
        <li class="lang-en">💈 Trim your hair and beard before going</li>
      </ul>

      <div class="highlight-box">
        <p class="lang-hi">💡 <strong>प्रो टिप:</strong> कैजुअल डेट के लिए जींस + शर्ट परफेक्ट है। फैंसी रेस्टोरेंट के लिए फॉर्मल जाएं।</p>
        <p class="lang-en">💡 <strong>Pro Tip:</strong> Jeans + shirt is perfect for casual dates. Go formal for fancy restaurants.</p>
      </div>

      <h2>📍 कहां जाएं? — बेस्ट डेट लोकेशन</h2>
      
      <p class="lang-hi">सही जगह चुनना बहुत ज़रूरी है। ऐसी जगह चुनें जहां बातचीत हो सके।</p>
      <p class="lang-en">Choosing the right place is very important. Choose a place where you can have a conversation.</p>

      <ul>
        <li class="lang-hi">☕ कैफे — बातचीत के लिए परफेक्ट</li>
        <li class="lang-en">☕ Cafe — Perfect for conversation</li>
        <li class="lang-hi">🌳 पार्क में वॉक — रिलैक्स्ड माहौल</li>
        <li class="lang-en">🌳 Walk in park — Relaxed atmosphere</li>
        <li class="lang-hi">🍕 कैजुअल रेस्टोरेंट — खाना + बातें</li>
        <li class="lang-en">🍕 Casual restaurant — Food + conversation</li>
        <li class="lang-hi">🎨 म्यूज़ियम या आर्ट गैलरी — यूनिक एक्सपीरियंस</li>
        <li class="lang-en">🎨 Museum or art gallery — Unique experience</li>
      </ul>

      <div class="warning-box">
        <p class="lang-hi">⚠️ <strong>पहली डेट पर न जाएं:</strong> मूवी (बातचीत नहीं होती), बहुत महंगी जगह (प्रेशर बनता है), क्लब (शोर में बात नहीं होती)</p>
        <p class="lang-en">⚠️ <strong>Avoid on first date:</strong> Movies (no conversation), expensive places (creates pressure), clubs (too noisy to talk)</p>
      </div>

      <h2>💬 क्या बात करें? — कन्वर्सेशन टिप्स</h2>
      
      <p class="lang-hi">अच्छी बातचीत से ही कनेक्शन बनता है। यहां कुछ टॉपिक्स हैं जिन पर बात कर सकते हो:</p>
      <p class="lang-en">Good conversation builds connection. Here are some topics you can talk about:</p>

      <ul>
        <li class="lang-hi">🎯 उसके interests और hobbies के बारे में पूछें</li>
        <li class="lang-en">🎯 Ask about her interests and hobbies</li>
        <li class="lang-hi">✈️ ट्रैवल स्टोरीज़ शेयर करें</li>
        <li class="lang-en">✈️ Share travel stories</li>
        <li class="lang-hi">🎬 फेवरेट मूवीज़/शोज़ के बारे में बात करें</li>
        <li class="lang-en">🎬 Talk about favorite movies/shows</li>
        <li class="lang-hi">🍔 फूड preferences के बारे में discuss करें</li>
        <li class="lang-en">🍔 Discuss food preferences</li>
        <li class="lang-hi">🎯 फ्यूचर goals और dreams के बारे में बात करें</li>
        <li class="lang-en">🎯 Talk about future goals and dreams</li>
      </ul>

      <div class="tip-box">
        <p class="lang-hi">✅ <strong>याद रखें:</strong> 70% सुनें, 30% बोलें। लड़कियों को अच्छा listener पसंद होता है!</p>
        <p class="lang-en">✅ <strong>Remember:</strong> Listen 70%, talk 30%. Girls like good listeners!</p>
      </div>

      <h2>🚫 ये गलतियां बिल्कुल न करें</h2>
      
      <ul>
        <li class="lang-hi">📱 फोन बार-बार चेक न करें</li>
        <li class="lang-en">📱 Don't check your phone repeatedly</li>
        <li class="lang-hi">💰 पैसों की शेखी न बघारें</li>
        <li class="lang-en">💰 Don't show off your money</li>
        <li class="lang-hi">👩 Ex के बारे में बात न करें</li>
        <li class="lang-en">👩 Don't talk about your ex</li>
        <li class="lang-hi">🤐 सिर्फ अपने बारे में न बोलते रहें</li>
        <li class="lang-en">🤐 Don't keep talking only about yourself</li>
        <li class="lang-hi">⏰ लेट मत पहुंचें</li>
        <li class="lang-en">⏰ Don't arrive late</li>
        <li class="lang-hi">🍺 शराब ज्यादा न पीएं</li>
        <li class="lang-en">🍺 Don't drink too much alcohol</li>
      </ul>

      <h2>💝 डेट के बाद क्या करें?</h2>
      
      <p class="lang-hi">डेट अच्छी गई? अब अगला स्टेप ज़रूरी है:</p>
      <p class="lang-en">Date went well? Now the next step is important:</p>

      <ul>
        <li class="lang-hi">📱 उसी रात या अगले दिन मैसेज करें</li>
        <li class="lang-en">📱 Text her the same night or next day</li>
        <li class="lang-hi">💬 बताएं कि टाइम अच्छा बीता</li>
        <li class="lang-en">💬 Tell her you had a good time</li>
        <li class="lang-hi">📅 दूसरी डेट के लिए प्लान करें</li>
        <li class="lang-en">📅 Plan for a second date</li>
      </ul>

      <div class="highlight-box">
        <p class="lang-hi">💕 अगर डेट अच्छी गई तो बधाई! अब रिलेशनशिप को आगे बढ़ाने के टिप्स जानिए अगले आर्टिकल में।</p>
        <p class="lang-en">💕 Congratulations if the date went well! Now learn tips to take the relationship forward in the next article.</p>
      </div>
    `,
    relatedPosts: [
      { slug: 'conversation-starters', emoji: '💬', title: { hi: 'बातचीत कैसे शुरू करें?', en: 'How to Start Conversation?' } },
      { slug: 'dating-profile-tips', emoji: '📸', title: { hi: 'डेटिंग प्रोफाइल टिप्स', en: 'Dating Profile Tips' } }
    ],
    nextPost: {
      slug: 'dating-profile-tips',
      title: { hi: 'डेटिंग प्रोफाइल टिप्स', en: 'Dating Profile Tips' },
      teaser: { hi: 'प्रोफाइल ही आपका पहला इम्प्रेशन है। जानिए कैसे बनाएं परफेक्ट प्रोफाइल...', en: 'Your profile is your first impression. Learn how to create the perfect profile...' }
    }
  },

  // ============================================
  // POST 3: Dating Profile Tips
  // ============================================
  'dating-profile-tips': {
    slug: 'dating-profile-tips',
    emoji: '📸',
    image: '/images/featured.jpg',
    title: {
      hi: '📸 परफेक्ट डेटिंग प्रोफाइल कैसे बनाएं? बायो और फोटो टिप्स',
      en: '📸 How to Create the Perfect Dating Profile? Bio & Photo Tips'
    },
    imageText: {
      hi: 'Profile से मिलेंगे 10x ज्यादा Match!',
      en: 'Get 10x More Matches with Profile!'
    },
    metaDesc: 'Dating profile tips for Indian men. Best bio ideas, photo tips, and common mistakes to avoid.',
    content: `
      <p class="lang-hi">डेटिंग ऐप पर आपकी प्रोफाइल ही आपका पहला इम्प्रेशन है। एक अच्छी प्रोफाइल से मैच मिलने के चांस 10 गुना बढ़ जाते हैं! आइए जानते हैं कैसे बनाएं एक irresistible प्रोफाइल। 📱✨</p>
      <p class="lang-en">Your profile is your first impression on dating apps. A good profile increases your chances of getting matches by 10x! Let's learn how to create an irresistible profile. 📱✨</p>

      <h2>📸 प्रोफाइल फोटो — सबसे ज़रूरी चीज़</h2>
      
      <p class="lang-hi">लड़कियां सबसे पहले आपकी फोटो देखती हैं। 3 सेकंड में फैसला हो जाता है - स्वाइप लेफ्ट या राइट!</p>
      <p class="lang-en">Girls look at your photos first. The decision happens in 3 seconds - swipe left or right!</p>

      <h3>✅ अच्छी फोटो के लिए:</h3>
      <ul>
        <li class="lang-hi">😊 पहली फोटो में साफ चेहरा दिखे, मुस्कुराते हुए</li>
        <li class="lang-en">😊 First photo should show clear face, smiling</li>
        <li class="lang-hi">📷 अच्छी लाइटिंग में फोटो लें (नेचुरल लाइट बेस्ट)</li>
        <li class="lang-en">📷 Take photos in good lighting (natural light is best)</li>
        <li class="lang-hi">👔 अलग-अलग आउटफिट्स में 4-5 फोटो रखें</li>
        <li class="lang-en">👔 Keep 4-5 photos in different outfits</li>
        <li class="lang-hi">🏃 कोई hobby या एक्टिविटी वाली फोटो ज़रूर रखें</li>
        <li class="lang-en">🏃 Include at least one hobby or activity photo</li>
        <li class="lang-hi">🐕 पेट के साथ फोटो = bonus points!</li>
        <li class="lang-en">🐕 Photo with pet = bonus points!</li>
      </ul>

      <h3>🚫 ये फोटो बिल्कुल न रखें:</h3>
      <ul>
        <li class="lang-hi">🕶️ सनग्लासेस वाली फोटो (आंखें नहीं दिखतीं)</li>
        <li class="lang-en">🕶️ Photos with sunglasses (eyes not visible)</li>
        <li class="lang-hi">👥 ग्रुप फोटो (कौन है पता नहीं चलता)</li>
        <li class="lang-en">👥 Group photos (can't tell who you are)</li>
        <li class="lang-hi">🪞 मिरर सेल्फी (cheap लगती है)</li>
        <li class="lang-en">🪞 Mirror selfies (looks cheap)</li>
        <li class="lang-hi">💪 शर्टलेस जिम फोटो (desperate लगता है)</li>
        <li class="lang-en">💪 Shirtless gym photos (looks desperate)</li>
        <li class="lang-hi">🚗 कार/बाइक के साथ फोटो (show-off)</li>
        <li class="lang-en">🚗 Photos with car/bike (show-off)</li>
      </ul>

      <div class="highlight-box">
        <p class="lang-hi">💡 <strong>प्रो टिप:</strong> अपनी बहन या किसी फीमेल फ्रेंड से फोटो सेलेक्ट करवाएं। वो बेहतर जानती हैं क्या अच्छा लगता है!</p>
        <p class="lang-en">💡 <strong>Pro Tip:</strong> Get your sister or a female friend to select photos. They know better what looks good!</p>
      </div>

      <h2>✍️ बायो लिखना — यहां होता है असली गेम</h2>
      
      <p class="lang-hi">अच्छी फोटो से ध्यान खिंचता है, लेकिन अच्छे बायो से बातचीत शुरू होती है।</p>
      <p class="lang-en">Good photos attract attention, but a good bio starts conversations.</p>

      <h3>बायो में क्या लिखें:</h3>
      <ul>
        <li class="lang-hi">🎯 अपने interests और hobbies (specific रखें)</li>
        <li class="lang-en">🎯 Your interests and hobbies (be specific)</li>
        <li class="lang-hi">😄 कुछ funny या witty</li>
        <li class="lang-en">😄 Something funny or witty</li>
        <li class="lang-hi">🍕 फूड preferences (conversation starter)</li>
        <li class="lang-en">🍕 Food preferences (conversation starter)</li>
        <li class="lang-hi">✈️ ट्रैवल या future goals</li>
        <li class="lang-en">✈️ Travel or future goals</li>
      </ul>

      <h3>🚫 बायो में क्या न लिखें:</h3>
      <ul>
        <li class="lang-hi">❌ "यहां टाइमपास के लिए नहीं हूं" (negative vibes)</li>
        <li class="lang-en">❌ "Not here for timepass" (negative vibes)</li>
        <li class="lang-hi">❌ Height, salary, या stats</li>
        <li class="lang-en">❌ Height, salary, or stats</li>
        <li class="lang-hi">❌ "मुझे describe करना मुश्किल है" (lazy)</li>
        <li class="lang-en">❌ "Hard to describe myself" (lazy)</li>
        <li class="lang-hi">❌ Instagram handle (desperate)</li>
        <li class="lang-en">❌ Instagram handle (desperate)</li>
      </ul>

      <div class="tip-box">
        <p class="lang-hi">✅ <strong>उदाहरण अच्छा बायो:</strong> "चाय lover ☕ | Weekend treks 🏔️ | बुरे jokes का master 😅 | अगर तुम्हें भी पानी पूरी में पानी ज्यादा पसंद है तो बात बन सकती है!"</p>
        <p class="lang-en">✅ <strong>Good Bio Example:</strong> "Tea lover ☕ | Weekend treks 🏔️ | Master of bad jokes 😅 | If you also like more water in pani puri, we might get along!"</p>
      </div>

      <h2>⚡ प्रोफाइल ऑप्टिमाइज़ेशन टिप्स</h2>
      
      <ul>
        <li class="lang-hi">🔄 हर 2 हफ्ते में फोटो बदलें</li>
        <li class="lang-en">🔄 Change photos every 2 weeks</li>
        <li class="lang-hi">📊 देखें कौन सी फोटो पर ज्यादा मैच आ रहे हैं</li>
        <li class="lang-en">📊 See which photo gets more matches</li>
        <li class="lang-hi">✓ प्रोफाइल verify करें (trust बढ़ता है)</li>
        <li class="lang-en">✓ Verify your profile (increases trust)</li>
        <li class="lang-hi">📱 Spotify/Instagram connect करें</li>
        <li class="lang-en">📱 Connect Spotify/Instagram</li>
      </ul>

      <div class="warning-box">
        <p class="lang-hi">⚠️ <strong>याद रखें:</strong> झूठी जानकारी न दें। मिलने पर सब पता चल जाता है और trust टूट जाता है!</p>
        <p class="lang-en">⚠️ <strong>Remember:</strong> Don't give false information. Everything is revealed when you meet and trust is broken!</p>
      </div>

      <p class="lang-hi">प्रोफाइल तैयार है? अब अगला challenge है - उसे मैसेज कैसे करें जिससे वो reply करे! 💬</p>
      <p class="lang-en">Profile ready? Now the next challenge is - how to message her so she replies! 💬</p>
    `,
    relatedPosts: [
      { slug: 'conversation-starters', emoji: '💬', title: { hi: 'बातचीत कैसे शुरू करें?', en: 'How to Start Conversation?' } },
      { slug: 'best-dating-apps', emoji: '💘', title: { hi: 'बेस्ट डेटिंग ऐप्स 2025', en: 'Best Dating Apps 2025' } }
    ],
    nextPost: {
      slug: 'conversation-starters',
      title: { hi: 'बातचीत कैसे शुरू करें?', en: 'How to Start Conversation?' },
      teaser: { hi: 'मैच हो गया? अब जानिए कैसे करें पहला मैसेज जिससे reply ज़रूर आए...', en: 'Got a match? Now learn how to send the first message that definitely gets a reply...' }
    }
  },

  // ============================================
  // POST 4: Conversation Starters
  // ============================================
  'conversation-starters': {
    slug: 'conversation-starters',
    emoji: '💬',
    image: '/images/featured.jpg',
    title: {
      hi: '💬 लड़की से बात कैसे शुरू करें? बेस्ट ओपनिंग लाइन्स',
      en: '💬 How to Start a Conversation? Best Opening Lines'
    },
    imageText: {
      hi: 'ये Lines से 100% Reply आएगा!',
      en: 'These Lines Get 100% Replies!'
    },
    metaDesc: 'Best conversation starters and opening lines for dating apps. Get more replies with these tips.',
    content: `
      <p class="lang-hi">मैच तो हो गया, लेकिन अब क्या बोलें? "Hi" या "Hello" भेजने से कुछ नहीं होता। आइए सीखते हैं कैसे करें ऐसी बातचीत जिससे वो reply करे! 💬✨</p>
      <p class="lang-en">You got a match, but what to say now? Sending "Hi" or "Hello" doesn't work. Let's learn how to start a conversation that gets replies! 💬✨</p>

      <h2>🚫 ये मैसेज भेजने से बचें</h2>
      
      <p class="lang-hi">पहले जानते हैं क्या नहीं करना चाहिए:</p>
      <p class="lang-en">First, let's know what not to do:</p>

      <ul>
        <li class="lang-hi">❌ "Hi" / "Hello" / "Hey" (बोरिंग, 100 लोग यही भेजते हैं)</li>
        <li class="lang-en">❌ "Hi" / "Hello" / "Hey" (boring, 100 people send the same)</li>
        <li class="lang-hi">❌ "How are you?" (generic, कोई जवाब नहीं आता)</li>
        <li class="lang-en">❌ "How are you?" (generic, no reply comes)</li>
        <li class="lang-hi">❌ "You're so beautiful" (creepy लगता है)</li>
        <li class="lang-en">❌ "You're so beautiful" (comes off as creepy)</li>
        <li class="lang-hi">❌ "Can we be friends?" (boring और desperate)</li>
        <li class="lang-en">❌ "Can we be friends?" (boring and desperate)</li>
        <li class="lang-hi">❌ इमोजी flood 😍😍😍🔥🔥🔥 (annoying)</li>
        <li class="lang-en">❌ Emoji flood 😍😍😍🔥🔥🔥 (annoying)</li>
      </ul>

      <div class="warning-box">
        <p class="lang-hi">⚠️ <strong>सच्चाई:</strong> लड़कियों को रोज़ाना 50+ "Hi" मिलते हैं। आपको अलग दिखना होगा!</p>
        <p class="lang-en">⚠️ <strong>Truth:</strong> Girls receive 50+ "Hi" messages daily. You need to stand out!</p>
      </div>

      <h2>✅ ऐसे करें पहला मैसेज</h2>
      
      <p class="lang-hi">उसकी प्रोफाइल देखो और कुछ specific notice करो:</p>
      <p class="lang-en">Look at her profile and notice something specific:</p>

      <h3>1. प्रोफाइल बेस्ड ओपनर:</h3>
      <ul>
        <li class="lang-hi">"तुम्हारी ट्रेकिंग वाली फोटो कहां की है? मैं भी हिमाचल जाने का प्लान बना रहा हूं!"</li>
        <li class="lang-en">"Where is your trekking photo from? I'm also planning to go to Himachal!"</li>
        <li class="lang-hi">"देखा तुम्हें भी chai पसंद है... चाय-पत्ती या cutting?"</li>
        <li class="lang-en">"I see you also like chai... chai-patti or cutting?"</li>
        <li class="lang-hi">"तुम्हारे doggo का नाम क्या है? बहुत cute है! 🐕"</li>
        <li class="lang-en">"What's your doggo's name? So cute! 🐕"</li>
      </ul>

      <h3>2. Fun और Playful ओपनर:</h3>
      <ul>
        <li class="lang-hi">"एक serious सवाल - पानी पूरी में पानी पहले या बाद में?"</li>
        <li class="lang-en">"A serious question - water in pani puri first or later?"</li>
        <li class="lang-hi">"अगर तुम एक pizza topping होती तो कौन सी होती? 🍕"</li>
        <li class="lang-en">"If you were a pizza topping, which one would you be? 🍕"</li>
        <li class="lang-hi">"Unpopular opinion: मोमोज़ mayo के बिना incomplete हैं। Agree?"</li>
        <li class="lang-en">"Unpopular opinion: Momos are incomplete without mayo. Agree?"</li>
      </ul>

      <h3>3. Witty ओपनर:</h3>
      <ul>
        <li class="lang-hi">"मुझे लगता है हमारे match में एक गलती हुई है... तुम मेरी league से बाहर हो 😅"</li>
        <li class="lang-en">"I think there's a mistake in our match... you're out of my league 😅"</li>
        <li class="lang-hi">"अगर हम Netflix show होते तो definitely 'Perfect Match' होते!"</li>
        <li class="lang-en">"If we were a Netflix show, we'd definitely be 'Perfect Match'!"</li>
      </ul>

      <div class="highlight-box">
        <p class="lang-hi">💡 <strong>गोल्डन रूल:</strong> ऐसा मैसेज भेजो जिसका जवाब देना आसान हो। Question पूछो!</p>
        <p class="lang-en">💡 <strong>Golden Rule:</strong> Send a message that's easy to reply to. Ask a question!</p>
      </div>

      <h2>💬 बातचीत को आगे कैसे बढ़ाएं?</h2>
      
      <ul>
        <li class="lang-hi">🎯 Open-ended questions पूछो (हां/ना वाले नहीं)</li>
        <li class="lang-en">🎯 Ask open-ended questions (not yes/no)</li>
        <li class="lang-hi">👂 उसकी बातों पर ध्यान दो और follow-up करो</li>
        <li class="lang-en">👂 Pay attention to her words and follow up</li>
        <li class="lang-hi">😄 हल्का humor maintain करो</li>
        <li class="lang-en">😄 Maintain light humor</li>
        <li class="lang-hi">🔄 Topics switch करते रहो</li>
        <li class="lang-en">🔄 Keep switching topics</li>
        <li class="lang-hi">📱 3-4 दिन चैट के बाद number या date मांगो</li>
        <li class="lang-en">📱 Ask for number or date after 3-4 days of chat</li>
      </ul>

      <div class="tip-box">
        <p class="lang-hi">✅ <strong>टिप:</strong> Reply में ज्यादा देर मत लगाओ, लेकिन तुरंत भी मत करो। 10-30 min का gap रखो।</p>
        <p class="lang-en">✅ <strong>Tip:</strong> Don't take too long to reply, but don't reply instantly either. Keep a 10-30 min gap.</p>
      </div>

      <h2>🚨 Red Flags पहचानो</h2>
      
      <ul>
        <li class="lang-hi">⚠️ एक word में reply (not interested)</li>
        <li class="lang-en">⚠️ One word replies (not interested)</li>
        <li class="lang-hi">⚠️ कभी questions नहीं पूछती</li>
        <li class="lang-en">⚠️ Never asks questions</li>
        <li class="lang-hi">⚠️ तुरंत Instagram/number मांगे</li>
        <li class="lang-en">⚠️ Asks for Instagram/number immediately</li>
        <li class="lang-hi">⚠️ पैसे या gifts मांगे (SCAM!)</li>
        <li class="lang-en">⚠️ Asks for money or gifts (SCAM!)</li>
      </ul>

      <p class="lang-hi">बातचीत अच्छी चल रही है? अब समय है रिलेशनशिप को serious लेने का। अगले आर्टिकल में जानिए कैसे! 💕</p>
      <p class="lang-en">Conversation going well? Now it's time to take the relationship seriously. Learn how in the next article! 💕</p>
    `,
    relatedPosts: [
      { slug: 'first-date-tips', emoji: '🌹', title: { hi: 'फर्स्ट डेट टिप्स', en: 'First Date Tips' } },
      { slug: 'relationship-tips', emoji: '💑', title: { hi: 'रिलेशनशिप टिप्स', en: 'Relationship Tips' } }
    ],
    nextPost: {
      slug: 'relationship-tips',
      title: { hi: 'रिलेशनशिप टिप्स', en: 'Relationship Tips' },
      teaser: { hi: 'अब जब वो interested है, जानिए कैसे बनाएं एक strong relationship...', en: 'Now that she is interested, learn how to build a strong relationship...' }
    }
  },

  // ============================================
  // POST 5: Relationship Tips
  // ============================================
  'relationship-tips': {
    slug: 'relationship-tips',
    emoji: '💑',
    image: '/images/featured.jpg',
    title: {
      hi: '💑 रिलेशनशिप टिप्स — उसे खुश कैसे रखें?',
      en: '💑 Relationship Tips — How to Keep Her Happy?'
    },
    imageText: {
      hi: 'GF को खुश रखने के Secret Tips!',
      en: 'Secret Tips to Keep Your GF Happy!'
    },
    metaDesc: 'Relationship tips for Indian men. How to build trust, communicate better and keep your girlfriend happy.',
    content: `
      <p class="lang-hi">बधाई हो! आपने girlfriend बना ली। लेकिन असली challenge अब शुरू होता है - रिलेशनशिप को strong कैसे बनाएं? इस गाइड में जानिए वो सब कुछ जो हर boyfriend को पता होना चाहिए! 💕</p>
      <p class="lang-en">Congratulations! You got a girlfriend. But the real challenge starts now - how to make the relationship strong? In this guide, learn everything every boyfriend should know! 💕</p>

      <h2>💬 Communication — सबसे ज़रूरी चीज़</h2>
      
      <p class="lang-hi">90% relationship problems की जड़ है - खराब communication। इसे सुधारो तो आधी problems solve हो जाएंगी।</p>
      <p class="lang-en">90% relationship problems stem from poor communication. Fix this and half the problems will be solved.</p>

      <ul>
        <li class="lang-hi">📱 रोज़ाना बात करो, चाहे 10 min ही हो</li>
        <li class="lang-en">📱 Talk daily, even if just for 10 minutes</li>
        <li class="lang-hi">👂 जब वो बोले, actually सुनो (phone side पर रखो)</li>
        <li class="lang-en">👂 When she talks, actually listen (put phone aside)</li>
        <li class="lang-hi">💭 अपनी feelings share करो, बंद मत रहो</li>
        <li class="lang-en">💭 Share your feelings, don't stay closed off</li>
        <li class="lang-hi">🗣️ Problems को bottle up मत करो, discuss करो</li>
        <li class="lang-en">🗣️ Don't bottle up problems, discuss them</li>
      </ul>

      <div class="highlight-box">
        <p class="lang-hi">💡 <strong>Important:</strong> लड़कियां hints देती हैं, सीधे नहीं बोलतीं। Observe करना सीखो!</p>
        <p class="lang-en">💡 <strong>Important:</strong> Girls give hints, they don't say things directly. Learn to observe!</p>
      </div>

      <h2>🎁 छोटी-छोटी बातों से फर्क पड़ता है</h2>
      
      <p class="lang-hi">Grand gestures से ज्यादा छोटी बातें याद रहती हैं:</p>
      <p class="lang-en">Small things are remembered more than grand gestures:</p>

      <ul>
        <li class="lang-hi">☕ बिना पूछे उसकी favourite चाय/coffee ले आओ</li>
        <li class="lang-en">☕ Get her favorite tea/coffee without asking</li>
        <li class="lang-hi">💐 बिना occasion के flowers दो</li>
        <li class="lang-en">💐 Give flowers without an occasion</li>
        <li class="lang-hi">📝 उसकी बातें याद रखो (पसंद/नापसंद)</li>
        <li class="lang-en">📝 Remember what she says (likes/dislikes)</li>
        <li class="lang-hi">🍕 Surprise dates plan करो</li>
        <li class="lang-en">🍕 Plan surprise dates</li>
        <li class="lang-hi">😊 "I'm thinking about you" मैसेज भेजो randomly</li>
        <li class="lang-en">😊 Send "I'm thinking about you" messages randomly</li>
      </ul>

      <div class="tip-box">
        <p class="lang-hi">✅ <strong>Pro Tip:</strong> Important dates याद रखो - anniversary, her birthday, first date की date। Calendar में डाल लो!</p>
        <p class="lang-en">✅ <strong>Pro Tip:</strong> Remember important dates - anniversary, her birthday, first date. Put them in your calendar!</p>
      </div>

      <h2>🤝 Trust कैसे बनाएं?</h2>
      
      <p class="lang-hi">Trust बनने में समय लगता है, टूटने में एक second। इसे protect करो:</p>
      <p class="lang-en">Trust takes time to build, a second to break. Protect it:</p>

      <ul>
        <li class="lang-hi">✓ जो बोलो वो करो (promises पूरे करो)</li>
        <li class="lang-en">✓ Do what you say (keep promises)</li>
        <li class="lang-hi">✓ Secrets share की हों तो रखो</li>
        <li class="lang-en">✓ Keep secrets she shares</li>
        <li class="lang-hi">✓ दूसरी लड़कियों से flirt मत करो</li>
        <li class="lang-en">✓ Don't flirt with other girls</li>
        <li class="lang-hi">✓ Phone छुपाने की ज़रूरत नहीं होनी चाहिए</li>
        <li class="lang-en">✓ You shouldn't need to hide your phone</li>
        <li class="lang-hi">✓ उसके friends और family को respect दो</li>
        <li class="lang-en">✓ Respect her friends and family</li>
      </ul>

      <h2>😤 झगड़े कैसे handle करें?</h2>
      
      <p class="lang-hi">झगड़े होना normal है। हर couple में होते हैं। लेकिन handle करना आना चाहिए:</p>
      <p class="lang-en">Fights are normal. Every couple has them. But you should know how to handle them:</p>

      <ul>
        <li class="lang-hi">🛑 गुस्से में react मत करो, थोड़ा रुको</li>
        <li class="lang-en">🛑 Don't react in anger, pause for a bit</li>
        <li class="lang-hi">🗣️ चिल्लाओ मत, calm रहकर बात करो</li>
        <li class="lang-en">🗣️ Don't shout, talk calmly</li>
        <li class="lang-hi">👂 उसकी side भी सुनो</li>
        <li class="lang-en">👂 Listen to her side too</li>
        <li class="lang-hi">🤝 "Win" करने की कोशिश मत करो, solve करो</li>
        <li class="lang-en">🤝 Don't try to "win", try to solve</li>
        <li class="lang-hi">💕 Sorry बोलने में ego मत लाओ</li>
        <li class="lang-en">💕 Don't let ego stop you from saying sorry</li>
      </ul>

      <div class="warning-box">
        <p class="lang-hi">⚠️ <strong>Never:</strong> Past की गलतियां बार-बार मत उठाओ। जो हो गया उसे छोड़ो।</p>
        <p class="lang-en">⚠️ <strong>Never:</strong> Don't keep bringing up past mistakes. Let go of what's done.</p>
      </div>

      <h2>🔥 Romance alive कैसे रखें?</h2>
      
      <ul>
        <li class="lang-hi">💏 Physical affection maintain करो (hugs, kisses)</li>
        <li class="lang-en">💏 Maintain physical affection (hugs, kisses)</li>
        <li class="lang-hi">📅 Weekly date night fix करो</li>
        <li class="lang-en">📅 Fix a weekly date night</li>
        <li class="lang-hi">✈️ साथ में trips plan करो</li>
        <li class="lang-en">✈️ Plan trips together</li>
        <li class="lang-hi">💬 Flirting बंद मत करो, relationship में भी करो</li>
        <li class="lang-en">💬 Don't stop flirting, do it in the relationship too</li>
        <li class="lang-hi">🎉 Small achievements भी celebrate करो</li>
        <li class="lang-en">🎉 Celebrate small achievements too</li>
      </ul>

      <h2>🎯 Final Words</h2>
      
      <p class="lang-hi">एक healthy relationship में दोनों लोग grow करते हैं। एक-दूसरे के dreams support करो, space दो, और हमेशा respect रखो। Love easy नहीं है, लेकिन right person के साथ हर effort worth it है! 💕</p>
      <p class="lang-en">In a healthy relationship, both people grow. Support each other's dreams, give space, and always maintain respect. Love isn't easy, but with the right person, every effort is worth it! 💕</p>

      <div class="highlight-box">
        <p class="lang-hi">💕 <strong>याद रखो:</strong> Perfect relationship नहीं होती, लेकिन imperfect person के साथ perfect बनाने की कोशिश ज़रूर होती है!</p>
        <p class="lang-en">💕 <strong>Remember:</strong> There's no perfect relationship, but there is an effort to make it perfect with an imperfect person!</p>
      </div>
    `,
    relatedPosts: [
      { slug: 'first-date-tips', emoji: '🌹', title: { hi: 'फर्स्ट डेट टिप्स', en: 'First Date Tips' } },
      { slug: 'conversation-starters', emoji: '💬', title: { hi: 'बातचीत कैसे शुरू करें?', en: 'How to Start Conversation?' } }
    ],
    nextPost: null // Last post
  }
};

module.exports = posts;

