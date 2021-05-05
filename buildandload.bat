@echo off
start /wait "building plugin" cmd /c npm run build
rem npm run build
echo errorlevel after npm run build is %errorlevel% 
if not errorlevel 0 exit

rem If we get this far then the .js file got created
echo copy /Y main.js D:\js_projs\sample_plugin\test-vault\.obsidian\plugins\sample-plugin
copy /Y main.js D:\js_projs\sample_plugin\test-vault\.obsidian\plugins\sample-plugin
echo errorlevel after copy is %errorlevel% 