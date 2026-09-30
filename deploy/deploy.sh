#!/usr/bin/env bash
# Push the current code to the VM, rebuild and restart. Run from your laptop:  ./deploy/deploy.sh
# The server's .env and database volume are never touched.
set -euo pipefail
VM=${VM:-dukanreviews}
ZONE=${ZONE:-asia-south1-a}
cd "$(dirname "$0")/.."
npm test
tar czf /tmp/dukan.tgz --exclude=node_modules --exclude='data.db*' --exclude=.env --exclude=.git .
gcloud compute scp /tmp/dukan.tgz "$VM":/tmp/dukan.tgz --zone "$ZONE"
gcloud compute ssh "$VM" --zone "$ZONE" --command '
set -e
cd /opt/dukanreviews
sudo tar xzf /tmp/dukan.tgz && rm /tmp/dukan.tgz
sudo docker compose up -d --build --wait   # waits until the app passes its health check
sudo docker image prune -f >/dev/null
sudo docker compose ps
'
