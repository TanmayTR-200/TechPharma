$fontsPath = "D:\Project\TechPharma\frontend\public\fonts"
$fontUrls = @(
    "https://fonts.gstatic.com/s/dmsans/v14/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAopxRHQ.woff2",
    "https://fonts.gstatic.com/s/dmsans/v14/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAkJxRHQ.woff2",
    "https://fonts.gstatic.com/s/dmsans/v14/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAmZxRHQ.woff2"
)
$fontNames = @(
    "DMSans-Regular.woff2",
    "DMSans-Medium.woff2",
    "DMSans-Bold.woff2"
)

for ($i = 0; $i -lt $fontUrls.Length; $i++) {
    $url = $fontUrls[$i]
    $fileName = $fontNames[$i]
    $outputPath = Join-Path $fontsPath $fileName
    
    Write-Host "Downloading $fileName..."
    Invoke-WebRequest -Uri $url -OutFile $outputPath
}