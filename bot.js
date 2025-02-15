const axios = require("axios");
const dotenv = require("dotenv");

// Environment variables load karo
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

let lastUpdateId = 0;

// Sleep function (delay ke liye)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Request logging ke liye interceptor
axios.interceptors.request.use((request) => {
  console.log(`\n🔄 Request: ${request.method.toUpperCase()} ${request.url}`);
  return request;
});

// Response logging
axios.interceptors.response.use(
  (response) => {
    console.log(`✅ Response: ${response.status} ${response.statusText}`);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.response ? error.response.data.description : error.message}`);
    return Promise.reject(error);
  }
);

// ✅ **Fetch pending join requests**
async function fetchPendingRequests() {
  try {
    console.log("\n🚀 Fetching pending join requests...");
    
    const response = await axios.get(`${API_URL}/getUpdates`, {
      params: {
        offset: lastUpdateId + 1,
        allowed_updates: JSON.stringify(["chat_join_request"]),
        timeout: 30
      }
    });

    if (!response.data.ok) {
      throw new Error(`Telegram API error: ${response.data.description}`);
    }

    const updates = response.data.result;
    for (const update of updates) {
      lastUpdateId = Math.max(lastUpdateId, update.update_id);

      if (update.chat_join_request) {
        const request = update.chat_join_request;
        const userId = request.from.id;
        const chatId = request.chat.id;
        const username = request.from.username || `User ID: ${userId}`;

        console.log(`📩 Join request from: ${username}`);
        await approveRequest(chatId, userId);
      }
    }
  } catch (error) {
    console.error("❌ Error fetching updates:", error.message);
  }
}

// ✅ **Approve join request**
async function approveRequest(chatId, userId) {
  try {
    console.log(`\n✅ Approving user: ${userId} in chat: ${chatId}`);
    
    const response = await axios.post(`${API_URL}/approveChatJoinRequest`, {
      chat_id: chatId,
      user_id: userId
    });

    if (response.data.ok) {
      console.log(`🎉 Approved successfully: ${userId}`);
    } else {
      console.error(`❌ Approval failed: ${response.data.description}`);
    }
  } catch (error) {
    console.error(`❌ Error approving request for ${userId}:`, error.message);
  }
}

// ✅ **Polling loop**
async function startPolling() {
  console.log("\n🤖 Bot started! Listening for join requests...");
  
  while (true) {
    await fetchPendingRequests();
    await sleep(5000); // 5 sec delay to prevent rate limits
  }
}

// ✅ **Start bot**
startPolling();
