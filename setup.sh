#!/bin/bash

# Standard setup script for class-action-sentinel

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting setup for class-action-sentinel...${NC}"

# Check for prerequisites
check_dependency() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${YELLOW}Warning: $1 is not installed.${NC}"
        return 1
    fi
    echo -e "${GREEN}✓ $1 is installed.${NC}"
    return 0
}

echo "Checking prerequisites..."
check_dependency "docker"
check_dependency "node"
check_dependency "npm"

# Docker Compose check (can be 'docker compose' or 'docker-compose')
if docker compose version &> /dev/null; then
    echo -e "${GREEN}✓ docker compose is installed.${NC}"
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓ docker-compose is installed.${NC}"
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${YELLOW}Warning: docker compose is not installed.${NC}"
    DOCKER_COMPOSE=""
fi

# Environment file setup
if [ -f .env.example ]; then
    if [ ! -f .env ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
        echo -e "${GREEN}✓ .env created.${NC}"
    else
        echo ".env already exists, skipping."
    fi
else
    echo -e "${YELLOW}Note: .env.example not found, skipping environment setup.${NC}"
fi

# Dependency management
if [ -f package.json ]; then
    echo "Installing dependencies..."
    npm install
    echo -e "${GREEN}✓ Dependencies installed.${NC}"
else
    echo -e "${YELLOW}Note: package.json not found, skipping npm install.${NC}"
fi

# Docker setup
if [ -f docker-compose.yml ]; then
    if [ -n "$DOCKER_COMPOSE" ]; then
        echo "Starting Docker containers..."
        $DOCKER_COMPOSE up -d --build
        echo -e "${GREEN}✓ Docker containers started.${NC}"
    else
        echo -e "${RED}Error: docker-compose.yml found but docker compose is not installed.${NC}"
    fi
else
    echo -e "${YELLOW}Note: docker-compose.yml not found, skipping Docker setup.${NC}"
fi

echo -e "${GREEN}Setup complete!${NC}"
