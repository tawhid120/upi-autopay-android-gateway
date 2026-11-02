@echo off
title Payviro Auto-Installer for Android
color 0A
cls
echo ========================================================
echo       Payviro UPI - Auto Installer (Bypass Restrictions)
echo ========================================================
echo.
echo Checking for connected Android phone via USB...
echo Make sure "USB Debugging" is enabled on your phone.
echo.

"%~dp0tools\platform-tools\adb.exe" start-server >nul 2>&1
"%~dp0tools\platform-tools\adb.exe" devices

echo.
echo Waiting for device authorization...
"%~dp0tools\platform-tools\adb.exe" wait-for-device

echo.
echo [1/2] Installing Payviro and automatically granting all permissions...
"%~dp0tools\platform-tools\adb.exe" install -r -g -d "%~dp0app-release.apk"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo  SUCCESS! Payviro installed with ALL permissions!
    echo  No Restricted Settings warning will appear!
    echo ========================================================
    echo.
    echo [2/2] Launching Payviro on your phone...
    "%~dp0tools\platform-tools\adb.exe" shell am start -n com.payverify.bd/.MainActivity
) else (
    echo.
    echo [ERROR] Installation failed!
    echo.
    echo [IMPORTANT REASON]: If you previously installed an older version,
    echo Android blocks the update if package conflicts occur.
    echo.
    echo Solution: Please uninstall the old app from your phone first,
    echo or press 'Y' below to automatically uninstall the old version and re-install!
    echo.
    set /p UNINSTALL_OLD="Uninstall old version and retry? (Y/N): "
    if /i "%UNINSTALL_OLD%"=="Y" (
        echo Uninstalling old version...
        "%~dp0tools\platform-tools\adb.exe" uninstall com.payverify.bd
        "%~dp0tools\platform-tools\adb.exe" uninstall com.payverify.app
        echo Re-installing Payviro...
        "%~dp0tools\platform-tools\adb.exe" install -r -g -d "%~dp0app-release.apk"
        if %ERRORLEVEL% EQU 0 (
            echo.
            echo SUCCESS! Payviro installed cleanly!
            "%~dp0tools\platform-tools\adb.exe" shell am start -n com.payverify.bd/.MainActivity
        )
    )
)

echo.
echo Press any key to exit...
pause >nul
