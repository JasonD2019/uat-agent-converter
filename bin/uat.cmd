@echo off
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..
node "%PROJECT_ROOT%\src\cli\uat-cli.js" %*