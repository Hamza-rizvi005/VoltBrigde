# Requires arduino-cli on PATH. This script builds only; it does not upload or change credentials.
# Install tools/libraries once:
# arduino-cli core update-index --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
# arduino-cli core install esp32:esp32 --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
# arduino-cli lib install ArduinoJson "Adafruit INA219" "Adafruit BusIO" PZEM004Tv30 ModbusMaster
param([string]$Board = 'esp32:esp32:esp32')
$ErrorActionPreference = 'Stop'
if (-not (Get-Command arduino-cli -ErrorAction SilentlyContinue)) { throw 'Install official Arduino CLI and the dependencies listed in this script first.' }
$sketch = Join-Path $PSScriptRoot 'volt_bridge_esp32'
foreach ($mode in @('MODE_PROTOTYPE_INA219', 'MODE_PRODUCTION_PZEM_RS485')) {
  $outputPath = Join-Path $PSScriptRoot ".build/$mode"
  & arduino-cli compile --fqbn $Board --build-path $outputPath --build-property "compiler.cpp.extra_flags=-D$mode" $sketch
  if ($LASTEXITCODE -ne 0) { throw "Build failed: $mode" }
}
& arduino-cli version
& arduino-cli core list
& arduino-cli lib list
