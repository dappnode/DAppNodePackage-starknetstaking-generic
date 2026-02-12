# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build arguments for environment variables
ARG VITE_STARKNET_NETWORK=mainnet
ARG VITE_STARKNET_RPC_URL=/rpc
ARG VITE_STRK_TOKEN_ADDRESS=0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
ARG VITE_STAKING_CONTRACT_ADDRESS_MAINNET=0x00ca1702e64c81d9a07b86bd2c540188d92a2c73cf5cc0e508d949015e7e84a7
ARG VITE_STAKING_CONTRACT_ADDRESS_SEPOLIA=0x03745ab04a431fc02871a139be6b93d9260b0ff3e779ad9c8b377183b23109f1
ARG VITE_STAKING_MIN_MAINNET=20000
ARG VITE_STAKING_MIN_SEPOLIA=1

# Set environment variables for build
ENV VITE_STARKNET_NETWORK=${VITE_STARKNET_NETWORK}
ENV VITE_STARKNET_RPC_URL=${VITE_STARKNET_RPC_URL}
ENV VITE_STRK_TOKEN_ADDRESS=${VITE_STRK_TOKEN_ADDRESS}
ENV VITE_STAKING_CONTRACT_ADDRESS_MAINNET=${VITE_STAKING_CONTRACT_ADDRESS_MAINNET}
ENV VITE_STAKING_CONTRACT_ADDRESS_SEPOLIA=${VITE_STAKING_CONTRACT_ADDRESS_SEPOLIA}
ENV VITE_STAKING_MIN_MAINNET=${VITE_STAKING_MIN_MAINNET}
ENV VITE_STAKING_MIN_SEPOLIA=${VITE_STAKING_MIN_SEPOLIA}

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Default RPC target (will be overridden by environment variable)
ENV PROVIDER_HTTP_URL=http://execution.starknet.dncore.dappnode:6060/v0_9

# Expose port 80
EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
