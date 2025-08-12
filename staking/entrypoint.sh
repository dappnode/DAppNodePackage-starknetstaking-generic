#!/bin/bash
set -e

echo "Starting Starknet Staking Validator..."

exec /app/validator \
  --provider-http "${PROVIDER_HTTP_URL}" \
  --provider-ws "${PROVIDER_WS_URL}" \
  --signer-op-address "${SIGNER_OPERATIONAL_ADDRESS}" \
  --signer-priv-key "${SIGNER_PRIVATE_KEY}" \
  --log-level "${LOG_LEVEL:-info}" \
  --metrics \
  --metrics-host "0.0.0.0" \
  --metrics-port "${METRICS_PORT}"
