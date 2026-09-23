# One-time setup: Android command-line tools + SDK packages needed to build the APK.
$ErrorActionPreference = 'Stop'
$jdk = (Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory | Where-Object Name -like 'jdk-21*' | Select-Object -First 1).FullName
$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$tools = Join-Path $sdk 'cmdline-tools'
New-Item -ItemType Directory -Force $tools | Out-Null

if (-not (Test-Path (Join-Path $tools 'latest\bin\sdkmanager.bat'))) {
  $zip = Join-Path $env:TEMP 'cmdtools.zip'
  Invoke-WebRequest 'https://dl.google.com/android/repository/commandlinetools-win-13114758_latest.zip' -OutFile $zip -UseBasicParsing
  Expand-Archive $zip $tools -Force
  Rename-Item (Join-Path $tools 'cmdline-tools') 'latest'
}

$env:JAVA_HOME = $jdk
$sdkm = Join-Path $tools 'latest\bin\sdkmanager.bat'
# Answer "y" to every license prompt (piping from PowerShell into a .bat doesn't reach the prompt, so go through cmd)
cmd /c "(for /l %i in (1,1,40) do @echo y) | `"$sdkm`" --sdk_root=`"$sdk`" --licenses" | Select-Object -Last 1
& $sdkm "--sdk_root=$sdk" 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' | Select-Object -Last 1

[Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdk, 'User')
[Environment]::SetEnvironmentVariable('JAVA_HOME', $jdk, 'User')
"JDK=$jdk"
"SDK=$sdk"
