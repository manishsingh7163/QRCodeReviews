# Azure Deployment Guide

## Option 1: Azure App Service (Recommended - Node.js)

### Prerequisites
```bash
# Install Azure CLI
brew install azure-cli

# Login to Azure
az login
```

### Quick Deploy (One Command)
```bash
# Replace YOUR_RESOURCE_GROUP and YOUR_APP_NAME
az webapp up \
  --name qrcodereview-app \
  --resource-group YOUR_RESOURCE_GROUP \
  --runtime "node|20-lts" \
  --plan "YOUR_APP_PLAN" \
  --location eastus
```

### Manual Step-by-Step Deployment

#### Step 1: Set Variables
```bash
RESOURCE_GROUP="qrcode-reviews-rg"
APP_NAME="qrcodereview-app"
LOCATION="eastus"
PLAN_NAME="qrcode-plan"
```

#### Step 2: Create Resource Group
```bash
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

#### Step 3: Create App Service Plan
```bash
az appservice plan create \
  --name $PLAN_NAME \
  --resource-group $RESOURCE_GROUP \
  --sku B1 \
  --is-linux
```

#### Step 4: Create Web App
```bash
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $PLAN_NAME \
  --name $APP_NAME \
  --runtime "node|20-lts"
```

#### Step 5: Configure Environment Variables
```bash
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    UPI_ID="9772883504@ybl" \
    OPENROUTER_API_KEY="your-api-key" \
    BASE_URL="https://${APP_NAME}.azurewebsites.net" \
    PORT=8080 \
    NODE_ENV="production"
```

#### Step 6: Deploy from GitHub
```bash
az webapp deployment github-actions add \
  --repo YOUR_GITHUB_REPO \
  --branch main \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP
```

Or deploy ZIP:
```bash
# From your local directory
az webapp deployment source config-zip \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --src <(cd /path/to/QRCodeReviews && zip -r - .)
```

---

## Option 2: Azure Container Instances (Docker)

### Prerequisites
```bash
brew install azure-cli
az login
```

### Deploy Container
```bash
RESOURCE_GROUP="qrcode-reviews-rg"
CONTAINER_NAME="qrcodereview-container"
IMAGE_NAME="qrcodereview:latest"

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location eastus

# Create and deploy container
az container create \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_NAME \
  --image $IMAGE_NAME \
  --cpu 1 \
  --memory 1 \
  --ports 3000 \
  --ip-address Public \
  --environment-variables \
    UPI_ID="9772883504@ybl" \
    OPENROUTER_API_KEY="your-api-key" \
    BASE_URL="https://qrcodereview.azurewebsites.net" \
    NODE_ENV="production"
```

---

## Option 3: Azure Static Web Apps (Limited - Frontend Only)

**Not recommended** for Node.js backend. Use Option 1 or 2 instead.

---

## Verify Deployment

```bash
# Check app status
az webapp show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "{state:state, url:defaultHostName}"

# View logs
az webapp log tail \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP

# Get URL
az webapp show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "defaultHostName" \
  --output tsv
```

---

## Database Persistence

SQLite database will be stored in `/app/data/data.db`:

```bash
# SSH into app to verify
az webapp remote-debugging enable \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP

# Or connect via SSH
az webapp ssh \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP
```

---

## Costs

| Option | Cost |
|--------|------|
| **App Service (B1)** | ~$11.50/month |
| **App Service (F1)** | Free tier (limited) |
| **Container Instances** | ~$0.0015/hour = ~$11/month |

---

## Troubleshooting

### App won't start
```bash
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP
```

### Port binding issues
- Azure App Service automatically uses port 8080 or PORT env var
- Ensure `PORT=8080` in environment variables

### Database file not persisting
- App Service free tier has ephemeral storage
- Use Azure File Share or upgrade to Standard tier for persistent storage

### Can't connect via SSH
```bash
# Ensure Kudu service is running
az webapp config set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --number-of-workers 1
```

---

## Next Steps

1. Create Azure account (if needed)
2. Install Azure CLI: `brew install azure-cli`
3. Login: `az login`
4. Set your variables (RESOURCE_GROUP, APP_NAME, etc.)
5. Run the deployment commands above
6. Get your URL: `https://${APP_NAME}.azurewebsites.net`
7. Add custom domain (optional)

---

## Custom Domain

```bash
az webapp config ssl bind \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --certificate-thumbprint THUMBPRINT
```

