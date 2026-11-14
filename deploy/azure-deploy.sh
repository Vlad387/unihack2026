#!/usr/bin/env bash
# Deploy the API to Azure: build the image HERE (Azure for Students blocks cloud builds,
# "ACR Tasks not permitted"), push it to the registry, restart the web app.
# The image clones the `main` branch, so merge dev -> main first.
# Needs: `az login`, Docker running. Names in ~/.config/citymind/azure_{acr,app}.
set -euo pipefail
cfg=~/.config/citymind
acr=$(cat "$cfg/azure_acr")
app=$(cat "$cfg/azure_app")
repo=$(cd "$(dirname "$0")/.." && pwd)
image="$acr.azurecr.io/citymind-api:latest"

# --no-cache: otherwise the cached "git clone" layer would ship old code
docker build --pull --no-cache -t "$image" "$repo/deploy/huggingface"
az acr login -n "$acr"
docker push "$image"
az webapp restart -g citymind-rg -n "$app" -o none
echo "restarting (~5 min): https://$app.azurewebsites.net/health/db"
