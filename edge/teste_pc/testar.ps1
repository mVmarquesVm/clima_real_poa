# ============================================================
# testar.ps1 — confere o Edge no PC, em 2 etapas:
#   1) g++         : compila e RODA os 31 autotestes (lógica pura)
#   2) arduino-cli : COMPILA o firmware inteiro para o ESP32
#                    (acha erro de compilação antes do Wokwi; não roda nada)
#
# Como rodar (de qualquer pasta):
#   powershell -ExecutionPolicy Bypass -File edge\teste_pc\testar.ps1
# ============================================================

$ErrorActionPreference = 'Stop'
$edge   = Split-Path $PSScriptRoot -Parent          # a pasta edge/
$build  = Join-Path $env:TEMP 'forno_alegre_build'  # tudo que é gerado fica fora do repositório
New-Item -ItemType Directory -Force $build | Out-Null

# O winget pode ter mudado o PATH depois que este terminal abriu
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
            [Environment]::GetEnvironmentVariable('Path', 'User')

# ---------- Etapa 1: autotestes no PC ----------
Write-Host "`n### Etapa 1: autotestes no PC (g++)" -ForegroundColor Cyan
$exe = Join-Path $build 'autoteste.exe'
g++ -std=c++17 -Wall -Wextra -I "$PSScriptRoot" "$PSScriptRoot\main.cpp" -o $exe
if ($LASTEXITCODE -ne 0) { Write-Host 'ERRO: nao compilou' -ForegroundColor Red; exit 1 }
& $exe
if ($LASTEXITCODE -ne 0) { Write-Host 'ERRO: algum autoteste falhou' -ForegroundColor Red; exit 1 }

# ---------- Etapa 2: compilar o firmware do ESP32 ----------
Write-Host "`n### Etapa 2: compilar o firmware do ESP32 (arduino-cli)" -ForegroundColor Cyan
# O arduino-cli exige que a pasta tenha o mesmo nome do .ino (sketch/sketch.ino),
# então copiamos só os arquivos do Wokwi para uma pasta temporária.
$sketch = Join-Path $build 'sketch'
New-Item -ItemType Directory -Force $sketch | Out-Null
Copy-Item "$edge\sketch.ino", "$edge\*.h" $sketch -Force
arduino-cli compile --fqbn esp32:esp32:esp32 --warnings default $sketch
if ($LASTEXITCODE -ne 0) { Write-Host 'ERRO: o firmware nao compilou' -ForegroundColor Red; exit 1 }

Write-Host "`nTudo certo: autotestes passaram e o firmware compila." -ForegroundColor Green
