@echo off
echo 🔍 Checking QR Generator Pro Setup...
echo ==================================

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Node.js is installed
    node --version
) else (
    echo ❌ Node.js is not installed
    pause
    exit /b 1
)

:: Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ npm is installed
    npm --version
) else (
    echo ❌ npm is not installed
    pause
    exit /b 1
)

:: Check if backend dependencies are installed
if exist "backend\node_modules" (
    echo ✅ Backend dependencies are installed
) else (
    echo ⚠️  Backend dependencies not found
    echo    Run: cd backend ^&^& npm install
)

:: Check if frontend dependencies are installed
if exist "frontend\node_modules" (
    echo ✅ Frontend dependencies are installed
) else (
    echo ⚠️  Frontend dependencies not found
    echo    Run: cd frontend ^&^& npm install
)

:: Check if backend .env exists
if exist "backend\.env" (
    echo ✅ Backend .env file exists
    
    :: Check for required environment variables
    findstr /C:"MONGODB_URI" backend\.env >nul 2>&1
    if %errorlevel% == 0 (
        echo ✅ MONGODB_URI is configured
    ) else (
        echo ⚠️  MONGODB_URI not found in backend\.env
    )
    
    findstr /C:"JWT_SECRET" backend\.env >nul 2>&1
    if %errorlevel% == 0 (
        echo ✅ JWT_SECRET is configured
    ) else (
        echo ⚠️  JWT_SECRET not found in backend\.env
    )
) else (
    echo ❌ Backend .env file not found
    echo    Create backend\.env with MONGODB_URI and JWT_SECRET
)

:: Check if frontend .env exists
if exist "frontend\.env" (
    echo ✅ Frontend .env file exists
) else (
    echo ⚠️  Frontend .env file not found ^(optional^)
)

echo.
echo 🚀 Setup Instructions:
echo ======================
echo 1. Make sure MongoDB is running
echo 2. Update backend\.env with your MongoDB connection string
echo 3. Run 'npm run install:all' to install all dependencies
echo 4. Run 'npm run dev' to start both backend and frontend
echo.
echo 📍 URLs:
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo 🎉 Your QR Generator Pro is ready to go!
echo.
pause
