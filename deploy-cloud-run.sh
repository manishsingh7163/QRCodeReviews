#!/bin/bash
# Quick deployment script to Google Cloud Run
# Usage: ./deploy-cloud-run.sh

set -e

PROJECT_ID="dukanreviews"
IMAGE_NAME="dukanreviews"
REGION="us-central1"

echo "🚀 Deploying QRCodeReviews to Cloud Run..."

# Step 1: Check gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Step 2: Set project
echo "📋 Setting up Google Cloud project..."
gcloud config set project $PROJECT_ID

# Step 3: Enable APIs
echo "🔧 Enabling required APIs..."
gcloud services enable run.googleapis.com containerregistry.googleapis.com artifactregistry.googleapis.com

# Step 4: Build and push Docker image
echo "🐳 Building Docker image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$IMAGE_NAME:latest

# Step 5: Deploy to Cloud Run
echo "🚢 Deploying to Cloud Run..."
gcloud run deploy $IMAGE_NAME \
  --image gcr.io/$PROJECT_ID/$IMAGE_NAME:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production,BASE_URL=https://dukanreviews.com,UPI_ID=9772883504@ybl,DB_PATH=/workspace/data/data.db,TRUST_PROXY=1

# Step 6: Get service URL
echo ""
echo "✅ Deployment complete!"
echo ""
gcloud run services describe $IMAGE_NAME --region $REGION --format='value(status.url)'
echo ""
echo "📝 Next steps:"
echo "1. Update your .env with the Cloud Run URL above"
echo "2. Configure custom domain in Cloud Console"
echo "3. Note: SQLite data won't persist. Migrate to Cloud SQL for production."
