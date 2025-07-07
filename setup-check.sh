#!/bin/bash

echo "🔍 Checking QR Generator Pro Setup..."
echo "=================================="

# Check if Node.js is installed
if command -v node &> /dev/null; then
    echo "✅ Node.js is installed: $(node --version)"
else
    echo "❌ Node.js is not installed"
    exit 1
fi

# Check if npm is installed
if command -v npm &> /dev/null; then
    echo "✅ npm is installed: $(npm --version)"
else
    echo "❌ npm is not installed"
    exit 1
fi

# Check if backend dependencies are installed
if [ -d "backend/node_modules" ]; then
    echo "✅ Backend dependencies are installed"
else
    echo "⚠️  Backend dependencies not found"
    echo "   Run: cd backend && npm install"
fi

# Check if frontend dependencies are installed
if [ -d "frontend/node_modules" ]; then
    echo "✅ Frontend dependencies are installed"
else
    echo "⚠️  Frontend dependencies not found"
    echo "   Run: cd frontend && npm install"
fi

# Check if backend .env exists
if [ -f "backend/.env" ]; then
    echo "✅ Backend .env file exists"
    
    # Check for required environment variables
    if grep -q "MONGODB_URI" backend/.env; then
        echo "✅ MONGODB_URI is configured"
    else
        echo "⚠️  MONGODB_URI not found in backend/.env"
    fi
    
    if grep -q "JWT_SECRET" backend/.env; then
        echo "✅ JWT_SECRET is configured"
    else
        echo "⚠️  JWT_SECRET not found in backend/.env"
    fi
else
    echo "❌ Backend .env file not found"
    echo "   Create backend/.env with MONGODB_URI and JWT_SECRET"
fi

# Check if frontend .env exists
if [ -f "frontend/.env" ]; then
    echo "✅ Frontend .env file exists"
else
    echo "⚠️  Frontend .env file not found (optional)"
fi

echo ""
echo "🚀 Setup Instructions:"
echo "======================"
echo "1. Make sure MongoDB is running"
echo "2. Update backend/.env with your MongoDB connection string"
echo "3. Run 'npm run install:all' to install all dependencies"
echo "4. Run 'npm run dev' to start both backend and frontend"
echo ""
echo "📍 URLs:"
echo "Backend:  http://localhost:5000"
echo "Frontend: http://localhost:5173"
echo ""
echo "🎉 Your QR Generator Pro is ready to go!"
