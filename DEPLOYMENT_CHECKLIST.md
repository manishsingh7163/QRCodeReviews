# Google Cloud Deployment Checklist

## Pre-Deployment Checklist

### Local Setup
- [ ] Create Google Cloud account (free tier)
- [ ] Install gcloud CLI: `brew install google-cloud-sdk`
- [ ] Run `gcloud init` and authenticate
- [ ] Verify Docker is installed: `docker --version`
- [ ] Verify Docker Compose is installed: `docker-compose --version`

### Project Preparation
- [ ] Update `.env` with production values
- [ ] Test locally: `npm start`
- [ ] Update Dockerfile PORT from 3000 to 8080 (for Cloud Run) or leave as-is (for Compute Engine)
- [ ] Verify Dockerfile builds: `docker build -t dukanreviews .`

---

## Deployment Checklist

### Option A: Compute Engine (Recommended for SQLite)

**Step 1: Create VM**
- [ ] Set Google Cloud project: `gcloud config set project dukanreviews`
- [ ] Enable APIs: 
  ```bash
  gcloud services enable compute.googleapis.com
  ```
- [ ] Create VM:
  ```bash
  gcloud compute instances create dukanreviews-vm \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --machine-type=e2-medium \
    --zone=us-central1-a \
    --boot-disk-size=30GB
  ```
- [ ] Verify instance is running: `gcloud compute instances list`

**Step 2: Initial Setup (SSH into VM)**
- [ ] SSH: `gcloud compute ssh dukanreviews-vm --zone us-central1-a`
- [ ] Update system: `sudo apt update && sudo apt upgrade -y`
- [ ] Install Docker:
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
  exit  # Reconnect
  ```
- [ ] Install Docker Compose:
  ```bash
  sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
  ```
- [ ] Install Nginx: `sudo apt install nginx -y`
- [ ] Install Certbot: `sudo apt install certbot python3-certbot-nginx -y`

**Step 3: Deploy App**
- [ ] Clone repo: `git clone https://github.com/your-username/QRCodeReviews.git`
- [ ] Navigate: `cd QRCodeReviews`
- [ ] Create data directory: `mkdir -p data && chmod 777 data`
- [ ] Create .env file with production settings
- [ ] Start app: `docker-compose up -d`
- [ ] Verify running: `docker-compose ps`
- [ ] Check logs: `docker-compose logs -f`

**Step 4: Static IP Setup**
- [ ] Create static IP:
  ```bash
  gcloud compute addresses create dukanreviews-ip --region us-central1
  ```
- [ ] Get IP address:
  ```bash
  gcloud compute addresses describe dukanreviews-ip --region us-central1 --format='value(address)'
  ```

**Step 5: Domain Configuration**
- [ ] Go to domain registrar (GoDaddy, Namecheap, etc.)
- [ ] Add A record: `dukanreviews.com -> <static-ip>`
- [ ] Add A record: `www.dukanreviews.com -> <static-ip>`
- [ ] Wait 5-10 minutes for DNS propagation
- [ ] Test: `ping dukanreviews.com`

**Step 6: SSL Setup**
- [ ] SSH into VM: `gcloud compute ssh dukanreviews-vm --zone us-central1-a`
- [ ] Get SSL certificate:
  ```bash
  sudo certbot certonly --standalone -d dukanreviews.com -d www.dukanreviews.com
  ```
- [ ] Note certificate paths from output

**Step 7: Nginx Configuration**
- [ ] Create Nginx config:
  ```bash
  sudo nano /etc/nginx/sites-available/dukanreviews
  ```
- [ ] Add configuration (see GOOGLE_CLOUD_DEPLOYMENT.md for full config)
- [ ] Enable site:
  ```bash
  sudo ln -s /etc/nginx/sites-available/dukanreviews /etc/nginx/sites-enabled/
  ```
- [ ] Test config: `sudo nginx -t`
- [ ] Restart Nginx: `sudo systemctl restart nginx`
- [ ] Enable on startup: `sudo systemctl enable nginx`

**Step 8: Verification**
- [ ] Test HTTP->HTTPS redirect: `curl -I http://dukanreviews.com`
- [ ] Visit in browser: https://dukanreviews.com
- [ ] Check SSL certificate: Browser > Lock icon
- [ ] Test billing page: https://dukanreviews.com/billing
- [ ] Check logs: `docker-compose logs -f`

---

### Option B: Cloud Run (Stateless)

**Step 1: Setup**
- [ ] Set project: `gcloud config set project dukanreviews`
- [ ] Enable APIs:
  ```bash
  gcloud services enable run.googleapis.com containerregistry.googleapis.com artifactregistry.googleapis.com
  ```

**Step 2: Update Dockerfile (if needed)**
- [ ] Change PORT to 8080
- [ ] Change DB_PATH to `/workspace/data/data.db`

**Step 3: Build & Deploy**
- [ ] Build image: `gcloud builds submit --tag gcr.io/dukanreviews/dukanreviews:latest`
- [ ] Deploy:
  ```bash
  gcloud run deploy dukanreviews \
    --image gcr.io/dukanreviews/dukanreviews:latest \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --memory 512Mi \
    --set-env-vars NODE_ENV=production,BASE_URL=https://dukanreviews.com,UPI_ID=9772883504@ybl
  ```
- [ ] Get URL: `gcloud run services describe dukanreviews --region us-central1 --format='value(status.url)'`

**Step 4: Domain Setup**
- [ ] In Google Cloud Console: Cloud Run > Services > dukanreviews > Manage Custom Domains
- [ ] Add domain: dukanreviews.com
- [ ] Follow DNS setup instructions
- [ ] Update A/CNAME records at registrar

**Step 5: Verification**
- [ ] Visit: https://dukanreviews.com
- [ ] Check logs: `gcloud run services describe dukanreviews --region us-central1`
- [ ] ⚠️ Note: SQLite data won't persist between deployments

---

## Post-Deployment Checklist

### Testing
- [ ] Homepage loads: https://dukanreviews.com
- [ ] Billing page shows: https://dukanreviews.com/billing
- [ ] UPI QR code generates
- [ ] Login/signup works
- [ ] Create test outlet
- [ ] Database file exists (Compute Engine): `ls -la data/data.db`
- [ ] Check app size: `du -sh .`

### Monitoring
- [ ] Set up log rotation (on Compute Engine)
- [ ] Monitor disk usage: `df -h`
- [ ] Monitor database size: `du -sh data/data.db`
- [ ] Check memory usage: `free -h`
- [ ] View CPU usage: `top` or `docker stats`

### Backups (Compute Engine Only)
- [ ] Create data backup: `cp data/data.db data/data.db.$(date +%Y%m%d)`
- [ ] Set up automated backups (cron)
- [ ] Store backups securely

### Environment Variables
- [ ] Verify BASE_URL is correct
- [ ] Verify UPI_ID is correct
- [ ] Add GOOGLE_CLIENT_ID if using OAuth
- [ ] Add OPENROUTER_API_KEY if using AI reviews
- [ ] Add RESEND_API_KEY if using email
- [ ] Restart app after changes: `docker-compose restart`

### SSL Certificate (Compute Engine)
- [ ] Certificate auto-renewal: `sudo certbot renew --dry-run`
- [ ] Set renewal cron: `sudo certbot renew`
- [ ] Test renewal: `sudo systemctl timer list | grep certbot`

### DNS & Domain
- [ ] A records are pointing to server IP
- [ ] HTTPS redirects from HTTP
- [ ] SSL certificate is valid (Browser > Lock icon)
- [ ] Both www and non-www work

---

## Maintenance Commands

### View Logs
```bash
# Compute Engine
docker-compose logs -f
docker-compose logs --tail 100 app
docker-compose logs app | grep error

# Cloud Run
gcloud logging read "resource.type=cloud_run_revision" --limit 50 --format json
```

### Restart App
```bash
docker-compose restart
docker-compose down && docker-compose up -d
```

### Update App
```bash
git pull origin main
docker-compose down
docker-compose up -d --build
```

### Database Management
```bash
# Check database
sqlite3 data/data.db ".tables"
sqlite3 data/data.db "SELECT COUNT(*) as owners FROM owners;"

# Backup
cp data/data.db data/data.db.backup

# Reset (careful!)
rm data/data.db
docker-compose restart  # Will recreate schema
```

### System Updates
```bash
sudo apt update
sudo apt upgrade -y
sudo systemctl restart docker
```

---

## Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| App won't start | `docker-compose logs app` - check for errors |
| Port 3000 in use | `sudo lsof -i :3000` - kill process or change port |
| Domain not resolving | Check A records, wait for DNS propagation |
| HTTPS not working | Check certificate: `sudo certbot certificates` |
| Database locked | Restart app: `docker-compose restart` |
| Out of disk space | Check: `df -h` then `du -sh *` |
| High CPU usage | Check `docker stats` - profile app or add resources |
| Memory issues | Increase VM RAM in Google Cloud Console |

---

## Cost Tracking

Check monthly bills:
```bash
gcloud billing accounts list
gcloud billing accounts describe <ACCOUNT_ID> --format='value(billingAccountName)'
```

Or visit: https://console.cloud.google.com/billing

---

## Done! 🎉

Once all checkboxes are complete:
- ✅ Your app is live
- ✅ Domain is working
- ✅ SSL is configured
- ✅ Monitoring is in place
- ✅ Backups are ready

Monitor and maintain regularly!
