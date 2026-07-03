require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { findReply } = require("./matcher");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

/* ============================================================
   WHATSAPP — Cloud API
   Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
   ============================================================ */

// 1. Webhook verification (Meta calls this once when you save the webhook URL)
app.get("/webhook/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WhatsApp] Webhook verified");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// 2. Incoming messages
app.post("/webhook/whatsapp", async (req, res) => {
  res.sendStatus(200); // ack immediately, Meta expects a fast response

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (!message || message.type !== "text") return;

    const from = message.from; // sender's WhatsApp number
    const text = message.text.body;

    const reply = findReply(text);
    if (!reply) return; // no keyword matched — stay silent

    await sendWhatsAppMessage(from, reply);
    console.log(`[WhatsApp] Replied to ${from}`);
  } catch (err) {
    console.error("[WhatsApp] Error handling message:", err.response?.data || err.message);
  }
});

async function sendWhatsAppMessage(to, text) {
  const url = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    },
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
  );
}

/* ============================================================
   INSTAGRAM — Graph API (DMs + comments, via connected FB Page)
   Docs: https://developers.facebook.com/docs/messenger-platform/instagram
   ============================================================ */

app.get("/webhook/instagram", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[Instagram] Webhook verified");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

app.post("/webhook/instagram", async (req, res) => {
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];

    // --- Direct messages ---
    const messagingEvent = entry?.messaging?.[0];
    if (messagingEvent?.message?.text) {
      const senderId = messagingEvent.sender.id;
      const text = messagingEvent.message.text;

      const reply = findReply(text);
      if (reply) {
        await sendInstagramDM(senderId, reply);
        console.log(`[Instagram] Replied to DM from ${senderId}`);
      }
      return;
    }

    // --- Comments on posts ---
    const change = entry?.changes?.[0];
    if (change?.field === "comments") {
      const commentText = change.value.text;
      const commentId = change.value.id;

      const reply = findReply(commentText);
      if (reply) {
        await replyToInstagramComment(commentId, reply);
        console.log(`[Instagram] Replied to comment ${commentId}`);
      }
    }
  } catch (err) {
    console.error("[Instagram] Error handling event:", err.response?.data || err.message);
  }
});

async function sendInstagramDM(recipientId, text) {
  const url = `https://graph.facebook.com/v20.0/me/messages`;
  await axios.post(
    url,
    { recipient: { id: recipientId }, message: { text } },
    { params: { access_token: process.env.INSTAGRAM_TOKEN } }
  );
}

async function replyToInstagramComment(commentId, text) {
  const url = `https://graph.facebook.com/v20.0/${commentId}/replies`;
  await axios.post(
    url,
    { message: text },
    { params: { access_token: process.env.INSTAGRAM_TOKEN } }
  );
}

/* ============================================================ */

app.get("/", (req, res) => {
  res.send("Auto-reply bot is running ✅");
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`WhatsApp webhook: http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`Instagram webhook: http://localhost:${PORT}/webhook/instagram`);
});
