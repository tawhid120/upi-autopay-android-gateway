@echo off
title UPI AutoPay Gateway - 1-Click Android Installer
color 0A
cls
echo ========================================================
echo   UPI AutoPay Gateway - 1-Click Installer (Bypass Restrictions)
echo ========================================================
echo.
echo 1. Make sure "USB Debugging" is turned ON in Developer Options.
echo 2. Connect your Android phone to PC with a USB cable.
echo.

adb start-server >nul 2>&1
adb devices

echo.
echo Installing UPI AutoPay Gateway with all permissions granted automatically...
adb install -r -g -d "%~dp0UPI-AutoPay-Gateway-v1.1.0.apk"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo  SUCCESS! App installed cleanly with ALL permissions!
    echo  Bypassed Play Protect and Restricted Settings!
    echo ========================================================
    echo.
    echo Launching App on phone...
    adb shell am start -n com.mvpay.autopay/.MainActivity
) else (
    echo.
    echo [ERROR] Installation failed or phone not connected!
    echo Make sure USB Debugging is allowed on your phone screen.
)

echo.
pause
