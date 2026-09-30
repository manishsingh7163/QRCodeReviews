# 🚀 Replit Quick Start

**Deploy in 3 minutes - No credit card needed!**

## Step 1: Go to Import
https://replit.com/import

## Step 2: Click "Github"
Paste your repo URL:
```
https://github.com/your-username/QRCodeReviews
```

## Step 3: Wait for Import
Takes 30-60 seconds. Replit will download your code.

## Step 4: Set Environment
Click `.env` file in left panel, add:
```
NODE_ENV=production
PORT=3000
BASE_URL=https://your-replit-url.replit.dev
UPI_ID=9772883504@ybl
OPENROUTER_API_KEY=your-api-key-here
```

## Step 5: Run
Click green **"Run"** button at top.

Wait 10-20 seconds...

## 🎉 Done!
Your app is live at:
```
https://qrcodereviews.your-username.replit.dev
```

---

## Useful Commands (in Replit Shell)

```bash
# Install dependencies
npm install

# View logs
tail -f data/data.db

# Restart server
killall node
```

---

## Keep Your App Running

**Free tier sleeps after 30 min inactivity.** Options:

1. **Use UptimeRobot** (free)
   - Go to uptimerobot.com
   - Add your Replit URL
   - Checks every 5 minutes (keeps app awake)

2. **Upgrade to Replit Pro**
   - $7/month for always-on
   - More CPU/RAM

3. **Leave browser open**
   - While developing/testing

---

## Test Your App

1. Visit your live URL
2. Create account
3. Click **"Billing"**
4. Click **"Show UPI QR Code"**
5. See QR code appear ✓
6. Enter receipt ID (test: `TEST123`)
7. Data saves to SQLite ✓

---

Done! Your app is live. 🎉
