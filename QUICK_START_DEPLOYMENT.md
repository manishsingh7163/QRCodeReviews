# Quick Start: Deploy to Google Cloud (Recommended)

## Summary

**Best Option**: Compute Engine VM with Docker Compose (recommended for SQLite persistence)

- ✅ Keeps your SQLite database (no migration needed)
- ✅ Works with your existing Docker Compose setup
- ✅ Full control over server
- ✅ Cost: ~$25-40/month
- ✅ Setup time: ~30 minutes

---

## 5-Minute Setup

### 1. Install Google Cloud CLI

```bash
# macOS
brew install google-cloud-sdk

# Linux / Windows: https://cloud.google.com/sdk/docs/install

# Initialize
gcloud init
gcloud auth login
```

### 2. Run One-Click Deployment

```bash
cd /Users/manish/Desktop/QRCodeReviews

# Make script executable
chmod +x deploy-compute-engine.sh

# Run deployment
./deploy-compute-engine.sh
```

This creates a VM and gives you the IP address.

### 3. Deploy Your App (SSH into VM)

```bash
# Replace with your actual IP
gcloud compute ssh dukanreviews-vm --zone us-central1-a

# Inside the VM:
git clone https://github.com/your-username/QRCodeReviews.git
cd QRCodeReviews
mkdir -p data
chmod 777 data

# Create .env file
cat > .env << 'EOF'
NODE_ENV=production
BASE_URL=https://dukanreviews.com
UPI_ID=9772883504@ybl
DB_PATH=/app/data/data.db
TRUST_PROXY=1
EOF

# Start the app
docker-compose up -d

# Verify it's running
docker-compose ps
docker-compose logs -f
```

### 4. Point Domain to Your VM

In your domain registrar (GoDaddy, Namecheap, etc.):

1. Find the **static IP** from your VM
2. Add **A record**: `dukanreviews.com -> <IP>`
3. Wait 5-10 minutes for DNS to update

### 5. Set Up HTTPS

SSH back into your VM and run:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot certonly --standalone -d dukanreviews.com -d www.dukanreviews.com

# Follow the prompts and note the certificate paths
```

Then update Nginx config at `/etc/nginx/sites-available/dukanreviews`:

```nginx
server {
    listen 443 ssl http2;
    server_name dukanreviews.com www.dukanreviews.com;
    
    ssl_certificate /etc/letsencrypt/live/dukanreviews.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dukanreviews.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name dukanreviews.com www.dukanreviews.com;
    return 301 https://$server_name$request_uri;
}
```

Restart Nginx:

```bash
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## Alternative: Cloud Run (Stateless, Auto-scaling)

If you don't need persistent SQLite data:

```bash
./deploy-cloud-run.sh
```

**Pros**: Auto-scales, serverless, free tier
**Cons**: SQLite data won't persist (need to migrate to Cloud SQL)

---

## Monitoring Your App

```bash
# View logs
docker-compose logs -f app

# Check if running
docker-compose ps

# View system stats
docker stats

# Restart if needed
docker-compose restart
docker-compose down && docker-compose up -d
```

---

## Common Commands

```bash
# SSH into VM
gcloud compute ssh dukanreviews-vm --zone us-central1-a

# View logs
gcloud compute ssh dukanreviews-vm --zone us-central1-a \
  --command "cd QRCodeReviews && docker-compose logs -f"

# Stop the app
gcloud compute ssh dukanreviews-vm --zone us-central1-a \
  --command "cd QRCodeReviews && docker-compose down"

# Get static IP
gcloud compute addresses describe dukanreviews-ip --region us-central1

# Delete VM (careful!)
gcloud compute instances delete dukanreviews-vm --zone us-central1-a
```

---

## Troubleshooting

### App won't start
```bash
# SSH into VM
gcloud compute ssh dukanreviews-vm --zone us-central1-a

# Check logs
docker-compose logs app

# Check if ports are in use
sudo lsof -i :3000
sudo lsof -i :80

# Restart everything
docker-compose down
docker-compose up -d
```

### Domain not working
```bash
# Check Nginx is running
sudo systemctl status nginx

# Check Nginx config
sudo nginx -t

# View Nginx error log
sudo tail -f /var/log/nginx/error.log
```

### Database issues
```bash
# Check database file exists
ls -la data/data.db

# Backup database
cp data/data.db data/data.db.backup

# Check database is accessible
sqlite3 data/data.db ".tables"
```

---

## Cost Breakdown (Monthly)

- **Compute Engine e2-medium**: ~$18-25
- **Persistent disk (30GB)**: ~$5
- **Static IP**: Free (only when attached)
- **Network egress**: Depends on traffic (first 1GB free)
- **Total**: ~$25-35/month

---

## Next Steps After Deployment

1. ✅ Test your app: https://dukanreviews.com
2. ✅ Check logs regularly
3. ✅ Set up backup strategy (backup data.db regularly)
4. ✅ Monitor database size (`du -sh data/`)
5. ✅ Add other optional env vars (Google OAuth, email, AI reviews)

---

## Need Help?

- **Google Cloud Docs**: https://cloud.google.com/docs
- **Docker Compose Docs**: https://docs.docker.com/compose/
- **Check logs**: `docker-compose logs -f`
- **Google Cloud Console**: https://console.cloud.google.com

Good luck! 🚀
