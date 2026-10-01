# Azure Quick Commands

## Install & Setup
```bash
# Install Azure CLI
brew install azure-cli

# Login to Azure
az login

# Set variables
export RESOURCE_GROUP="qrcode-reviews-rg"
export APP_NAME="qrcodereview-app"
export LOCATION="eastus"
export PLAN_NAME="qrcode-plan"
```

## Quick Deploy (Automated)
```bash
cd /Users/manish/Desktop/QRCodeReviews
bash deploy-azure.sh qrcode-reviews-rg qrcodereview-app
```

---

## Manual Deploy (Copy-Paste Commands)

### 1. Create Resource Group
```bash
az group create \
  --name qrcode-reviews-rg \
  --location eastus
```

### 2. Create App Service Plan
```bash
az appservice plan create \
  --name qrcode-plan \
  --resource-group qrcode-reviews-rg \
  --sku B1 \
  --is-linux
```

### 3. Create Web App
```bash
az webapp create \
  --resource-group qrcode-reviews-rg \
  --plan qrcode-plan \
  --name qrcodereview-app \
  --runtime "node|20-lts"
```

### 4. Set Environment Variables
```bash
az webapp config appsettings set \
  --name qrcodereview-app \
  --resource-group qrcode-reviews-rg \
  --settings \
    UPI_ID="9772883504@ybl" \
    OPENROUTER_API_KEY="your-api-key" \
    BASE_URL="https://qrcodereview-app.azurewebsites.net" \
    PORT=8080 \
    NODE_ENV="production"
```

### 5. Deploy Code
```bash
cd /Users/manish/Desktop/QRCodeReviews
zip -r deploy.zip . -x "node_modules/*" ".git/*"
az webapp deployment source config-zip \
  --name qrcodereview-app \
  --resource-group qrcode-reviews-rg \
  --src deploy.zip
```

---

## Get Your App URL
```bash
az webapp show \
  --name qrcodereview-app \
  --resource-group qrcode-reviews-rg \
  --query "defaultHostName" \
  --output tsv
```

Result will be: `qrcodereview-app.azurewebsites.net`

Visit: `https://qrcodereview-app.azurewebsites.net`

---

## View Logs (Real-time)
```bash
az webapp log tail \
  --name qrcodereview-app \
  --resource-group qrcode-reviews-rg
```

---

## Check App Status
```bash
az webapp show \
  --name qrcodereview-app \
  --resource-group qrcode-reviews-rg \
  --query "{state:state, url:defaultHostName}"
```

---

## Restart App
```bash
az webapp restart \
  --name qrcodereview-app \
  --resource-group qrcode-reviews-rg
```

---

## Delete Everything (When Done)
```bash
az group delete \
  --name qrcode-reviews-rg \
  --yes
```

---

## Costs

| SKU | Cost/Month | Notes |
|-----|----------|-------|
| **F1 (Free)** | $0 | 60 mins/day, 1GB storage |
| **B1** | ~$11.50 | Recommended, 24/7 uptime |
| **S1** | ~$46 | High performance |

**Recommended for this project**: B1 ($11.50/month)

---

## Database Persistence

SQLite database stores at `/app/data/data.db`

For B1+ plans: Data persists across restarts ✅

For F1 (Free) plan: Data may be lost on app restart ⚠️

To backup:
```bash
az webapp ssh \
  --name qrcodereview-app \
  --resource-group qrcode-reviews-rg

# Inside SSH:
# ls /app/data/
# cat /app/data/data.db > /tmp/backup.db
```

---

## Custom Domain (Optional)

1. Buy domain (GoDaddy, Namecheap, etc.)
2. Add CNAME record pointing to: `qrcodereview-app.azurewebsites.net`
3. Run:
```bash
az webapp config hostname add \
  --webapp-name qrcodereview-app \
  --resource-group qrcode-reviews-rg \
  --hostname yourdomain.com
```

---

## Troubleshooting

### "Resource group already exists"
```bash
# List existing groups
az group list --query "[].name" -o table

# Use existing group instead of creating new
```

### "App already exists"
```bash
# Delete and recreate
az webapp delete \
  --name qrcodereview-app \
  --resource-group qrcode-reviews-rg

# Then run step 3 again
```

### "Port binding error"
Ensure `PORT=8080` is set in environment variables (step 4)

### Check what's running
```bash
az webapp config show \
  --name qrcodereview-app \
  --resource-group qrcode-reviews-rg
```

