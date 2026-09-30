#!/usr/bin/env bash
# One-time VM setup: installs Docker + the Compose plugin. Run on the VM:  bash setup-vm.sh
set -euo pipefail
curl -fsSL https://get.docker.com | sudo sh
sudo mkdir -p /opt/dukanreviews
echo "Done: $(sudo docker --version), $(sudo docker compose version)"
