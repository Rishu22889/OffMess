#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting OffMess Application...${NC}\n"

# Start Backend
echo -e "${GREEN}Starting Backend (FastAPI)...${NC}"
cd apps/api
nohup .venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > server.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"
cd ../..

# Start Frontend
echo -e "${GREEN}Starting Frontend (Next.js)...${NC}"
cd apps/web
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"
cd ../..

echo -e "\n${GREEN}✓ Both servers started successfully!${NC}"
echo -e "\n${BLUE}Access your application:${NC}"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo -e "\n${BLUE}To stop servers, run:${NC} ./stop.sh"
