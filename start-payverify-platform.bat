@echo off
title PayVerify BD v2 - Payment Automation SaaS Platform
color 0b
echo ========================================================
echo    PayVerify BD v2 - Payment Automation SaaS Platform
echo ========================================================
echo.
echo [1/3] Checking environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed! Please install Node.js v18+.
    pause
    exit /b 1
)

echo [2/3] Starting PayVerify Unified Production Core (Port 4000)...
cd /d "%~dp0backend"
start "PayVerify Core Engine" cmd /k "node dist/server.js"

echo.
echo [3/3] Opening Web Dashboard & SaaS Portal...
timeout /t 2 >nul
start http://localhost:4000/

echo.
echo ========================================================
echo  PayVerify BD v2 is LIVE and OPERATIONAL!
echo ========================================================
echo  Landing Page:        http://localhost:4000/
echo  Merchant Dashboard:  http://localhost:4000/dashboard
echo  Super Admin Panel:   http://localhost:4000/admin
echo  Developer Docs:      http://localhost:4000/docs
echo.
echo  Default Super Admin Credentials:
echo  Email:    admin@payverify.com
echo  Password: Admin@123456
echo ========================================================
echo.
pause
