# StaffApp - Rebuild with Icons Fix
# Run this script to fix missing icons

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  StaffApp Icon Fix - Rebuild" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$staffAppPath = "d:\EZYEnquiry\StaffApp"

Write-Host "Step 1: Cleaning Android build..." -ForegroundColor Yellow
cd "$staffAppPath\android"
.\gradlew clean
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Clean failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Clean complete!" -ForegroundColor Green
Write-Host ""

cd $staffAppPath

Write-Host "Step 2: Clearing Metro cache..." -ForegroundColor Yellow
if (Test-Path "$env:TEMP\metro-*") {
    Remove-Item -Recurse -Force "$env:TEMP\metro-*" -ErrorAction SilentlyContinue
}
if (Test-Path "$env:TEMP\haste-*") {
    Remove-Item -Recurse -Force "$env:TEMP\haste-*" -ErrorAction SilentlyContinue
}
Write-Host "✅ Cache cleared!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Verifying fonts..." -ForegroundColor Yellow
$fontsPath = "$staffAppPath\android\app\src\main\assets\fonts"
if (Test-Path $fontsPath) {
    $fontCount = (Get-ChildItem $fontsPath -Filter "*.ttf").Count
    Write-Host "✅ Found $fontCount font files in assets!" -ForegroundColor Green
} else {
    Write-Host "❌ Fonts folder not found!" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Build Preparation Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start Metro bundler (if not running):" -ForegroundColor White
Write-Host "   npx react-native start --reset-cache" -ForegroundColor Gray
Write-Host ""
Write-Host "2. In a NEW terminal, rebuild app:" -ForegroundColor White
Write-Host "   cd d:\EZYEnquiry\StaffApp" -ForegroundColor Gray
Write-Host "   npx react-native run-android" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Wait for app to install and launch" -ForegroundColor White
Write-Host ""
Write-Host "Icons should now display correctly! 🎉" -ForegroundColor Green
