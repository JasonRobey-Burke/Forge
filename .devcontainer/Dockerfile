FROM node:20-slim

RUN apt-get update -y \
    && apt-get install -y openssl curl procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspaces/Forge
