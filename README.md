# Auto-Reply Bot (WhatsApp + Instagram)

Sends automatic product replies on WhatsApp and Instagram when a message
contains a keyword (e.g. "shoes", "price", "link"). Built on Meta's
**official** APIs — this is required; unofficial/scraping tools get numbers
and accounts banned.

## How it works
1. Someone messages your WhatsApp Business number or Instagram account.
2. Meta forwards that message to this app via a webhook.
3. `matcher.js` checks the message text against keywords in `products.json`.
4. If there's a match, the app replies automatically with the product info/link.
5. If nothing matches, it stays silent (no spammy replies to every message).

## 1. Install
```bash
npm install
cp .env.example .env
```
Fill in `.env` with your own values (see step 3 below for where to get them).

## 2. Edit your product catalog
Open `products.json` and add your real products, keywords, and links.
Keep keywords lowercase and simple — matching is case-insensitive and
looks for the keyword *anywhere* in the message.

## 3. Get Meta API access (one-time setup, ~15–20 min)

### WhatsApp
1. Go to [business.facebook.com](https://business.facebook.com) → create a Business Account (free).
2. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) → Create App → type "Business".
3. Add the **WhatsApp** product to your app.
4. Under WhatsApp → API Setup, you'll get:
   - A temporary access token (24h) — put in `WHATSAPP_TOKEN`
   - A **Phone Number ID** — put in `WHATSAPP_PHONE_NUMBER_ID`
   - For production, generate a **permanent token** under System Users (Business Settings).

### Instagram
1. Your Instagram account must be a **Business or Creator account**, connected to a Facebook Page.
2. In the same Meta App, add the **Instagram** + **Messenger** products.
3. Generate a Page Access Token with `instagram_manage_messages` and
   `instagram_manage_comments` permissions — put in `INSTAGRAM_TOKEN`.
4. Note your Instagram Business Account ID — put in `INSTAGRAM_BUSINESS_ACCOUNT_ID`.

## 4. Run the app locally
```bash
npm start
```
This starts a server at `http://localhost:3000`.

## 5. Expose it to the internet (Meta requires a public HTTPS URL)
Meta can't call `localhost`, so use a tunnel while testing:
```bash
npx ngrok http 3000
```
This gives you a URL like `https://abcd1234.ngrok-free.app`.

## 6. Register your webhook in the Meta App dashboard
For **both** WhatsApp and Instagram products, in the "Webhooks" section, set:
- Callback URL: `https://abcd1234.ngrok-free.app/webhook/whatsapp` (or `/webhook/instagram`)
- Verify Token: whatever you set as `VERIFY_TOKEN` in `.env`
- Subscribe to fields: `messages` (WhatsApp), `messages` + `comments` (Instagram)

Meta will call the URL once to verify — your running server handles that
automatically (see `server.js`).

## 7. Test it
Send a WhatsApp message or Instagram DM containing a keyword like "shoes" to
your connected account/number. You should get an auto-reply within seconds.
Check your terminal logs for confirmation.

## Going to production
- Host this on a real server (Render, Railway, a VPS, etc.) instead of ngrok,
  so it stays online permanently.
- Use a **permanent** WhatsApp token, not the 24h temporary one.
- Consider adding a database instead of `products.json` if your catalog is large.
- Add rate-limiting/dedupe logic if you expect high volume, to avoid replying
  twice to the same message on retries.

## Files
- `server.js` — Express server, webhook endpoints for both platforms
- `matcher.js` — keyword matching logic
- `products.json` — your product catalog + fallback reply
- `.env.example` — copy to `.env` and fill in your tokens
