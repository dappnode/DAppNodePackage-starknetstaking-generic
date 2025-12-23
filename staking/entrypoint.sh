#!/bin/bash
set -e

# Configuration for health check
MAX_RETRIES=${HEALTH_CHECK_MAX_RETRIES:-360}  # 360 retries = 2 hours with 20s sleep
SLEEP_INTERVAL=${HEALTH_CHECK_SLEEP_INTERVAL:-20}  # 20 seconds between retries
TIMEOUT=${HEALTH_CHECK_TIMEOUT:-5}  # 5 seconds timeout for each health check

echo "Starting Starknet Staking Validator..."

# Health check function
check_endpoint_health() {
  local url=$1
  if curl --silent --fail --max-time "${TIMEOUT}" "${url}" > /dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

# Wait for PROVIDER_HTTP_URL to be available
if [ -n "${PROVIDER_HTTP_URL}" ]; then
  echo "Checking if provider endpoint is available: ${PROVIDER_HTTP_URL}"
  
  attempt=1
  while [ $attempt -le $MAX_RETRIES ]; do
    echo "[Attempt ${attempt}/${MAX_RETRIES}] Checking endpoint health..."
    
    if check_endpoint_health "${PROVIDER_HTTP_URL}"; then
      echo "✓ Endpoint is healthy and ready!"
      break
    else
      if [ $attempt -eq $MAX_RETRIES ]; then
        echo "✗ ERROR: Endpoint not available after ${MAX_RETRIES} attempts. Exiting."
        exit 1
      fi
      echo "✗ Endpoint not ready yet. Waiting ${SLEEP_INTERVAL} seconds before retry..."
      sleep "${SLEEP_INTERVAL}"
      attempt=$((attempt + 1))
    fi
  done
else
  echo "WARNING: PROVIDER_HTTP_URL is not set. Skipping health check."
fi

echo "Starting validator application..."

exec /app/validator \
  --provider-http "${PROVIDER_HTTP_URL}" \
  --provider-ws "${PROVIDER_WS_URL}" \
  --signer-op-address "${SIGNER_OPERATIONAL_ADDRESS}" \
  --signer-priv-key "${SIGNER_PRIVATE_KEY}" \
  --log-level "${LOG_LEVEL:-info}" \
  --metrics \
  --metrics-host "0.0.0.0" \
  --metrics-port "${METRICS_PORT}"
