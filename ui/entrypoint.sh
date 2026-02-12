#!/bin/sh
set -e

# Substitute environment variables in nginx config
envsubst '${PROVIDER_HTTP_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Execute the CMD
exec "$@"
