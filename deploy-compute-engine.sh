#!/bin/bash
# Deployment script to Google Compute Engine with Docker
# Usage: ./deploy-compute-engine.sh

set -e

PROJECT_ID="news-446308"
INSTANCE_NAME="news-446308-vm"
ZONE="us-central1-a"
MACHINE_TYPE="e2-medium"

echo "🚀 Deploying QRCodeReviews to Compute Engine..."

# Step 1: Check gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Step 2: Set project
echo "📋 Setting up Google Cloud project..."
gcloud config set project $PROJECT_ID

# Step 3: Check billing is enabled
echo "💳 Checking billing status..."
if ! gcloud billing projects describe $PROJECT_ID --format='value(billingAccountName)' 2>/dev/null | grep -q "billingAccounts"; then
    echo "❌ Billing is not enabled for project '$PROJECT_ID'"
    echo ""
    echo "📝 To enable billing:"
    echo "   1. Go to: https://console.cloud.google.com/billing"
    echo "   2. Click 'Link Billing Account'"
    echo "   3. Select account and link to '$PROJECT_ID'"
    echo "   4. Wait 1-2 minutes"
    echo "   5. Run this script again"
    echo ""
    exit 1
fi
echo "✅ Billing is enabled"

# Step 4: Enable APIs
echo "🔧 Enabling required APIs..."
gcloud services enable compute.googleapis.com

# Step 5: Create VM instance
echo "🖥️  Creating Compute Engine instance..."
gcloud compute instances create $INSTANCE_NAME \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --machine-type=$MACHINE_TYPE \
  --zone=$ZONE \
  --boot-disk-size=30GB \
  --scopes=https://www.googleapis.com/auth/cloud-platform \
  --metadata startup-script='#!/bin/bash
set -e
apt update && apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
apt install nginx certbot python3-certbot-nginx git -y
' 2>&1 | grep -E "Created|done"

echo "✅ Instance created. Getting IP address..."

# Step 6: Get static IP
echo "📍 Setting up static IP..."
gcloud compute addresses create $INSTANCE_NAME-ip \
  --region=${ZONE%-*}

STATIC_IP=$(gcloud compute addresses describe $INSTANCE_NAME-ip --region=${ZONE%-*} --format='value(address)')
echo "Static IP: $STATIC_IP"

# Step 7: Instructions
echo ""
echo "✅ Instance created successfully!"
echo ""
echo "📝 Next steps:"
echo "1. SSH into instance:"
echo "   gcloud compute ssh $INSTANCE_NAME --zone $ZONE"
echo ""
echo "2. In the instance, clone and deploy:"
echo "   git clone https://github.com/your-username/QRCodeReviews.git"
echo "   cd QRCodeReviews"
echo "   mkdir -p data"
echo "   # Create .env file with production config"
echo "   docker-compose up -d"
echo ""
echo "3. Set up domain:"
echo "   - Add A record: dukanreviews.com -> $STATIC_IP"
echo "   - SSH and run: sudo certbot certonly --standalone -d dukanreviews.com"
echo "   - Update Nginx config in /etc/nginx/sites-available/dukanreviews"
echo ""
echo "4. Monitor:"
echo "   docker-compose logs -f"
echo "   docker stats"
