# 🚀 Replit Deployment Guide

Deploy your QRCodeReviews app to Replit in **3 minutes** - no credit card, always free!

## ✨ Why Replit?

- ✅ **No credit card needed** - truly free
- ✅ **Persistent storage** - SQLite data saved
- ✅ **Always online** - 24/7 uptime
- ✅ **Easy deployment** - copy-paste setup
- ✅ **Instant sharing** - live link in seconds

---

## 🚀 Quick Start (3 Minutes)

### Step 1: Go to Replit Import
Visit: https://replit.com/import

### Step 2: Import from GitHub
1. Click **"Github"** option
2. Paste your GitHub repo URL:
   ```
   https://github.com/your-username/QRCodeReviews
   ```
3. Click **"Import"**
4. Wait 30-60 seconds for import to complete

### Step 3: Configure Environment
1. In the Replit editor, open `.env` file
2. Add your configuration:
   ```
   NODE_ENV=production
   PORT=3000
   BASE_URL=https://your-replit-url.replit.dev
   UPI_ID=9772883504@ybl
   OPENROUTER_API_KEY=your-api-key-here
   ```
3. Save (Ctrl+S or Cmd+S)

### Step 4: Run
1. Click the **"Run"** button (green play button at top)
2. Wait 10-20 seconds for server to start
3. Your app is live! 🎉

---

## 📍 Your Live URL

Once running, Replit gives you a URL like:
```
https://qrcodereviews.your-username.replit.dev
```

**Share this link with anyone** - your app is live!

---

## 📁 File Structure Expected

```
QRCodeReviews/
├── .replit                 ← Replit config (already created)
├── package.json            ← Node dependencies
├── server.js               ← Main server file
├── views.js                ← HTML templates
├── db.js                   ← Database setup
├── .env                    ← Environment variables
├── data/
│   └── data.db            ← SQLite database (persists)
└── ... (other files)
```

---

## 🔐 Environment Variables

Create a `.env` file in the root with:

```env
# Required
NODE_ENV=production
PORT=3000
BASE_URL=https://your-replit-url.replit.dev
UPI_ID=9772883504@ybl

# Optional (for features)
OPENROUTER_API_KEY=your-key-here
GOOGLE_CLIENT_ID=optional
GOOGLE_CLIENT_SECRET=optional
RESEND_API_KEY=optional
EMAIL_FROM=optional@example.com
```

**To keep API keys secret:**
1. In Replit, click the lock icon on the left panel
2. Click **"Secrets"**
3. Add each key-value pair
4. Reference in code as `process.env.KEY_NAME`

---

## 💾 Database Persistence

Your SQLite database is **automatically persistent** in Replit:

- Location: `/app/data/data.db`
- Survives restarts
- No backups needed for testing
- Plan backups for production

---

## ⚡ Performance Tips

### Keep App Awake
By default, Replit free tier apps sleep after inactivity. To prevent:

**Option 1: Use Replit's "Always On" (if available)**
- Settings → "Always On" → Enable

**Option 2: Uptime Monitor (Free)**
- Use UptimeRobot.com
- Add your Replit URL
- Checks every 5 minutes (keeps alive)

### Keep Database Fast
SQLite is fine for small apps. Monitor performance with:
- Open DevTools (F12) → Network tab
- Check response times
- If slow, consider migration to PostgreSQL later

---

## 🛠️ Common Issues

### Issue: "Module not found"
**Solution:**
```bash
# Click "Shell" at top
# Run:
npm install
```

### Issue: Port already in use
**Solution:** 
- The `.replit` file is configured for port 3000
- Should work automatically
- If not, change PORT in `.env`

### Issue: Database not saving
**Solution:**
- Check `.env` has correct `DB_PATH`
- Default is `/app/data/data.db`
- Create `/app/data` folder if missing

### Issue: App too slow
**Solution:**
- Replit free tier has shared resources
- Consider upgrading to Replit Pro ($7/month) for more power
- Or migrate to Fly.io/Railway later

---

## 🌐 Custom Domain (Advanced)

To use your own domain (e.g., qrcodereview.com):

1. In Replit, click **"Tools"** → **"Domain"**
2. Enter your domain
3. Add DNS records (CNAME) pointing to Replit
4. Wait for SSL certificate (5-10 min)

---

## 📊 Monitoring

### Check Logs
- Click **"Console"** at bottom to see server output
- Shows requests, errors, database operations

### Check Performance
- Replit shows CPU/Memory usage in top-right
- Free tier should be under 256MB RAM
- If higher, optimize database queries

### Check Uptime
- Use UptimeRobot (free)
- Monitors your URL every 5 minutes
- Alerts if app goes down

---

## 🚀 Next Steps

1. **Deploy now:**
   - Go to https://replit.com/import
   - Choose GitHub
   - Paste your repo URL
   - Click "Run"

2. **Test the app:**
   - Visit your Replit URL
   - Create an account
   - Test QR code payment flow
   - Check database saves data

3. **Make it production:**
   - Keep Replit running
   - Set up uptime monitoring
   - Add custom domain
   - Share with users!

---

## 📈 When to Upgrade

**Upgrade to Replit Pro if:**
- App is too slow (need more CPU)
- Need always-on (no sleeping)
- Want priority support

**Migrate to Fly.io/Railway if:**
- Need more storage
- Want better performance
- Need advanced monitoring

---

## ⚠️ Replit Limitations

- **Shared resources** - slower than dedicated VPS
- **Auto-sleep** - app pauses after 30 min inactivity (Pro fixes this)
- **Public by default** - code visible unless private repo
- **5GB storage** - enough for SQLite with data

---

## ✅ Checklist

- [ ] GitHub repo created with all code
- [ ] `.env` file configured with UPI_ID
- [ ] `.replit` file in root directory
- [ ] Replit project created and imported
- [ ] Environment variables set (or Secrets)
- [ ] App starts with "Run" button
- [ ] Database persists after restart
- [ ] Live URL works
- [ ] QR code payment flow tested
- [ ] Shared with users

---

## 🎉 Success!

Your app is now **live and free** on Replit!

- **Uptime**: 24/7
- **Cost**: $0
- **Credit card**: Not needed
- **Data**: Persistent in SQLite
- **Scaling**: Easy migration path

Happy coding! 🚀

---

## 📞 Support

**Replit Docs**: https://docs.replit.com
**Node.js Help**: https://nodejs.org/docs
**SQLite Guide**: https://www.sqlite.org/quickstart.html

Need help? Check the deployment checklist or read the Quick Start section again!
