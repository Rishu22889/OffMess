#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${RED}Stopping OffMess Application...${NC}\n"

# Stop Backend
echo "Stopping Backend..."
pkill -f "uvicorn app.main:app"

# Stop Frontend
echo "Stopping Frontend..."
pkill -f "next dev"

echo -e "\n${GREEN}✓ All servers stopped${NC}"
