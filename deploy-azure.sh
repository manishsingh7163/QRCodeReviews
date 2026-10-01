#!/bin/bash

# Azure App Service Quick Deploy Script
# Usage: bash deploy-azure.sh <resource-group> <app-name>

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 2 ]; then
  echo -e "${RED}Usage: bash deploy-azure.sh <resource-group> <app-name>${NC}"
  echo "Example: bash deploy-azure.sh qrcode-rg qrcodereview-app"
  exit 1
fi

RESOURCE_GROUP=$1
APP_NAME=$2
LOCATION="eastus"
PLAN_NAME="${APP_NAME}-plan"

echo -e "${YELLOW}🚀 Azure App Service Deployment${NC}"
echo "Resource Group: $RESOURCE_GROUP"
echo "App Name: $APP_NAME"
echo "Location: $LOCATION"

# Step 1: Check Azure CLI
echo -e "${YELLOW}Step 1: Checking Azure CLI...${NC}"
if ! command -v az &> /dev/null; then
  echo -e "${RED}❌ Azure CLI not found. Install: brew install azure-cli${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Azure CLI found${NC}"

# Step 2: Check login
echo -e "${YELLOW}Step 2: Checking Azure login...${NC}"
if ! az account show &> /dev/null; then
  echo -e "${YELLOW}Not logged in. Running: az login${NC}"
  az login
fi
ACCOUNT=$(az account show --query "name" -o tsv)
echo -e "${GREEN}✓ Logged in as: $ACCOUNT${NC}"

# Step 3: Create resource group
echo -e "${YELLOW}Step 3: Creating resource group...${NC}"
if az group exists --name $RESOURCE_GROUP | grep -q true; then
  echo -e "${GREEN}✓ Resource group already exists${NC}"
else
  az group create --name $RESOURCE_GROUP --location $LOCATION
  echo -e "${GREEN}✓ Resource group created${NC}"
fi

# Step 4: Create app service plan
echo -e "${YELLOW}Step 4: Creating app service plan...${NC}"
az appservice plan create \
  --name $PLAN_NAME \
  --resource-group $RESOURCE_GROUP \
  --sku B1 \
  --is-linux || true
echo -e "${GREEN}✓ App service plan ready${NC}"

# Step 5: Create web app
echo -e "${YELLOW}Step 5: Creating web app...${NC}"
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $PLAN_NAME \
  --name $APP_NAME \
  --runtime "node|20-lts" || true
echo -e "${GREEN}✓ Web app created${NC}"

# Step 6: Configure app settings
echo -e "${YELLOW}Step 6: Configuring environment variables...${NC}"
read -p "Enter UPI_ID (default: 9772883504@ybl): " UPI_ID
UPI_ID=${UPI_ID:-"9772883504@ybl"}

read -p "Enter OpenRouter API key (optional): " OPENROUTER_API_KEY
OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-""}

az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    UPI_ID="$UPI_ID" \
    OPENROUTER_API_KEY="$OPENROUTER_API_KEY" \
    BASE_URL="https://${APP_NAME}.azurewebsites.net" \
    PORT=8080 \
    NODE_ENV="production"
echo -e "${GREEN}✓ Environment variables configured${NC}"

# Step 7: Deploy code
echo -e "${YELLOW}Step 7: Deploying code...${NC}"
ZIP_FILE="/tmp/qrcodereview-${RANDOM}.zip"
cd "$(dirname "$0")" # Go to repo root
zip -r "$ZIP_FILE" . -x "node_modules/*" ".git/*" "deploy/*" "*.log"
az webapp deployment source config-zip \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --src "$ZIP_FILE"
rm "$ZIP_FILE"
echo -e "${GREEN}✓ Code deployed${NC}"

# Step 8: Show deployment info
echo -e "${YELLOW}Step 8: Getting deployment info...${NC}"
URL=$(az webapp show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "defaultHostName" \
  --output tsv)

echo ""
echo -e "${GREEN}🎉 Deployment successful!${NC}"
echo ""
echo "📍 Your app is live at:"
echo -e "${GREEN}https://${URL}${NC}"
echo ""
echo "📋 Next steps:"
echo "  1. Visit: https://${URL}"
echo "  2. Test the UPI payment flow"
echo "  3. View logs: az webapp log tail -n $APP_NAME -g $RESOURCE_GROUP"
echo "  4. Add custom domain (optional)"
echo ""
