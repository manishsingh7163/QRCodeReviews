# Deploying QRCodeReviews to Google Cloud

## Overview

Your app can be deployed to Google Cloud using **Cloud Run** (recommended) or **App Engine**. Cloud Run is ideal because:
- ✅ Supports Docker containers (you already have Dockerfile)
- ✅ Auto-scales based on traffic (pay only for what you use)
- ✅ Free tier: 180,000 vCPU-seconds/month
- ✅ Simple setup from your existing Docker configuration

## Option 1: Cloud Run (Recommended)

### Prerequisites
1. Google Cloud Account (free tier available)
2. `gcloud` CLI installed: https://cloud.google.com/sdk/docs/install
3. Docker installed locally
4. Your project files ready

### Step 1: Set Up Google Cloud Project

```bash
# Install gcloud CLI (if not already installed)
brew install google-cloud-sdk  # macOS

# Initialize and authenticate
gcloud init
gcloud auth login

# Create a new project (or use existing)
gcloud projects create dukanreviews --name="DukanReviews"

# Set the project as default
gcloud config set project dukanreviews

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Step 2: Configure Environment Variables

Create a `.env.production` file in your project root:

```bash
cat > .env.production << 'EOF'
NODE_ENV=production
PORT=3000
BASE_URL=https://yourdomain.com
UPI_ID=9772883504@ybl
DB_PATH=/workspace/data/data.db
TRUST_PROXY=1

# Add only if configured
# GOOGLE_CLIENT_ID=your_client_id
# GOOGLE_CLIENT_SECRET=your_client_secret
# OPENROUTER_API_KEY=your_key
# RESEND_API_KEY=your_key
# EMAIL_FROM=noreply@yourdomain.com
EOF
```

### Step 3: Update Dockerfile for Cloud Run

Your current Dockerfile runs on port 3000 but Cloud Run requires the app to listen on `$PORT` (default 8080). The Dockerfile already handles this with `PORT=3000` ENV, but update it:

```dockerfile
# Modify your Dockerfile to:
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080 DB_PATH=/workspace/data/data.db
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
RUN mkdir -p /workspace/data && chown node:node /workspace/data
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:8080/').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
```

### Step 4: Deploy to Cloud Run

```bash
# Navigate to project directory
cd /Users/manish/Desktop/QRCodeReviews

# Build and push to Container Registry
gcloud builds submit --tag gcr.io/dukanreviews/dukanreviews:latest

# Deploy to Cloud Run
gcloud run deploy dukanreviews \
  --image gcr.io/dukanreviews/dukanreviews:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600 \
  --max-instances 10 \
  --env-vars-file .env.production

# Output will show your Cloud Run URL:
# Service URL: https://dukanreviews-xxxxxxx.run.app
```

### Step 5: Set Custom Domain

```bash
# Verify your domain ownership in Google Cloud Console

# Add custom domain to Cloud Run service
gcloud run services update-traffic dukanreviews \
  --to-revisions LATEST=100 \
  --region us-central1

# Then in Google Cloud Console:
# 1. Go to Cloud Run > dukanreviews > Manage Custom Domains
# 2. Add your domain (dukanreviews.com)
# 3. Follow DNS setup instructions (add CNAME/A records)
```

### Step 6: Set Up Persistent Database Storage

Cloud Run has ephemeral storage. For persistent SQLite:

**Option A: Use Google Cloud Storage (GCS) + Local SQLite**
```bash
# This is complex - not recommended for SQLite

# Option B: Use Cloud SQL (PostgreSQL) - Better
# Create Cloud SQL instance and migrate to PostgreSQL
# This requires code changes to use pg instead of sqlite3
```

**Option C: Use Compute Engine VM with Persistent Disk** (Simpler)
- See "Option 2: Compute Engine" below

---

## Option 2: Compute Engine (Recommended for SQLite)

Better for persistent SQLite databases without changes.

### Step 1: Create VM Instance

```bash
gcloud compute instances create dukanreviews-vm \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --machine-type=e2-medium \
  --zone=us-central1-a \
  --boot-disk-size=30GB \
  --scopes=https://www.googleapis.com/auth/cloud-platform
```

### Step 2: SSH into VM

```bash
gcloud compute ssh dukanreviews-vm --zone us-central1-a
```

### Step 3: Install Docker and Deploy

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
exit  # Reconnect to apply group changes

# Clone your repo
git clone https://github.com/your-username/QRCodeReviews.git
cd QRCodeReviews

# Create data directory
mkdir -p data
sudo chown 1000:1000 data

# Create .env file
cat > .env << 'EOF'
NODE_ENV=production
BASE_URL=https://dukanreviews.com
UPI_ID=9772883504@ybl
DB_PATH=/app/data/data.db
PORT=3000
TRUST_PROXY=1
# ... add other env vars
EOF

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

### Step 4: Set Up Reverse Proxy with Nginx

```bash
sudo apt install nginx -y

# Create Nginx config
sudo tee /etc/nginx/sites-available/dukanreviews > /dev/null << 'EOF'
server {
    listen 80;
    server_name dukanreviews.com www.dukanreviews.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dukanreviews.com www.dukanreviews.com;
    
    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/dukanreviews.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dukanreviews.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/dukanreviews /etc/nginx/sites-enabled/
sudo nginx -t  # Test config
sudo systemctl restart nginx

# Set up SSL with Certbot
sudo apt install certbot python3-certbot-nginx -y
sudo certbot certonly --standalone -d dukanreviews.com -d www.dukanreviews.com
```

### Step 5: Set Up Automatic Startup

```bash
# Create systemd service
sudo tee /etc/systemd/system/dukanreviews.service > /dev/null << 'EOF'
[Unit]
Description=DukanReviews Docker App
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=/home/your-username/QRCodeReviews
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
RemainAfterExit=yes
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable dukanreviews
```

---

## Option 3: App Engine (Standard)

Simplest but less control. Doesn't work well with SQLite (ephemeral filesystem).

```bash
# Create app.yaml in your project root
cat > app.yaml << 'EOF'
runtime: nodejs18

env: standard

env_variables:
  NODE_ENV: "production"
  BASE_URL: "https://dukanreviews.com"
  PORT: "8080"

automatic_scaling:
  min_instances: 1
  max_instances: 10

handlers:
  - url: /.*
    script: auto

skip_files:
  - ^node_modules$
  - ^\.git$
  - ^\.env$
EOF

# Deploy
gcloud app deploy
```

**Note**: App Engine standard doesn't support persistent SQLite. You'd need Cloud SQL (PostgreSQL).

---

## Comparison Table

| Feature | Cloud Run | Compute Engine | App Engine |
|---------|-----------|----------------|------------|
| **Setup Time** | 15 min | 30 min | 10 min |
| **Cost** | $0.00002400/vCPU-sec (free tier: 180k/mo) | ~$20-40/month VM | ~$0.05-0.10/hour |
| **SQLite Support** | ❌ Ephemeral FS | ✅ Yes | ❌ Ephemeral FS |
| **Auto-scaling** | ✅ Yes | ❌ Manual | ✅ Yes |
| **Best For** | Stateless apps | Persistent DB | Simple apps |
| **Recommended** | If migrating to Cloud SQL | **For SQLite** | ❌ Not ideal |

---

## Recommended Setup: Compute Engine + Nginx + Docker

Based on your app requirements, I recommend **Compute Engine** because:
1. Your SQLite database needs persistent storage
2. Easy to set up with your existing Docker Compose
3. Full control over environment
4. Cost-effective for small-medium traffic

---

## Monitoring & Logs

### On Compute Engine:

```bash
# View app logs
docker-compose logs -f app

# View system resources
docker stats

# SSH and check status
gcloud compute ssh dukanreviews-vm --zone us-central1-a
docker-compose ps
```

### On Cloud Run:

```bash
# View logs
gcloud run services describe dukanreviews --region us-central1

# Stream logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=dukanreviews" --limit 50 --format json
```

---

## Setting Up Custom Domain

### For Google Cloud:

1. **Verify domain ownership** in Google Cloud Console
2. **Add DNS records**:
   - For Cloud Run: Add CNAME to your DNS provider
   - For Compute Engine: Add A record pointing to static IP

```bash
# Get static IP for Compute Engine
gcloud compute addresses create dukanreviews-ip \
  --region us-central1

gcloud compute addresses describe dukanreviews-ip \
  --region us-central1
```

Then add A record in your domain provider (GoDaddy, Namecheap, etc.)

---

## Environment Variables for Production

Update your `.env.production`:

```bash
# Server
NODE_ENV=production
PORT=3000
BASE_URL=https://dukanreviews.com
TRUST_PROXY=1

# Payments
UPI_ID=9772883504@ybl

# Database
DB_PATH=/app/data/data.db  # Or Cloud SQL if using PostgreSQL

# Optional: Add when configured
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
OPENROUTER_API_KEY=your_api_key
RESEND_API_KEY=your_resend_key
EMAIL_FROM=noreply@dukanreviews.com
```

---

## Cost Estimation

### Cloud Run
- **Free tier**: 180,000 vCPU-sec/month + 1M requests/month
- **After free tier**: ~$2-5/month for small traffic

### Compute Engine
- **e2-medium instance**: ~$20-30/month
- **Persistent disk**: ~$5-10/month
- **Total**: ~$25-40/month

### App Engine
- **Pay per request**: ~$5-20/month
- **Requires Cloud SQL**: +$25/month

---

## Next Steps

1. **Choose your option** (I recommend Compute Engine for SQLite)
2. **Create a Google Cloud project**
3. **Set up billing** (free tier available)
4. **Deploy using instructions above**
5. **Configure custom domain**
6. **Monitor logs and performance**

---

## Troubleshooting

### Cloud Run issues:
```bash
# Check service status
gcloud run services describe dukanreviews --region us-central1

# View recent deployments
gcloud run services describe dukanreviews --region us-central1 --format="value(status.observedGeneration)"

# Delete and redeploy
gcloud run services delete dukanreviews --region us-central1
```

### Compute Engine issues:
```bash
# SSH into VM
gcloud compute ssh dukanreviews-vm --zone us-central1-a

# Check Docker status
sudo systemctl status docker
docker ps
docker logs container_id

# Check Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

---

## Questions?

Run `gcloud help` for more information or check Google Cloud docs at https://cloud.google.com/docs
