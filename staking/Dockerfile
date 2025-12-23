ARG UPSTREAM_VERSION

# Stage 1: pull upstream binary
FROM nethermind/starknet-staking-v2:${UPSTREAM_VERSION} AS upstream

# Stage 2: final image
FROM alpine:3.21

# Install runtime deps
RUN apk add --no-cache bash ca-certificates curl

# Copy the validator binary from the upstream stage
COPY --from=upstream /ko-app/validator /app/validator

# Add your entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
