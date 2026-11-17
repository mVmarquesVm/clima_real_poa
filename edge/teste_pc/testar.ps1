# ============================================================
# testar.ps1 — confere o Edge no PC, em 3 etapas:
#   1) g++         : compila e RODA os autotestes (lógica pura)
#   2) gcc         : RODA o chip do anemômetro com um Wokwi falso
#   3) arduino-cli : COMPILA o firmware inteiro para o ESP32
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
# Roda 1 vez para cada estação (ESTACAO = 1 a 4): o config.h muda o nome,
# o ponto e os refúgios, e os testes conferem a configuração de cada uma.
# A saída completa aparece só na E1; nas outras, só o resultado.
foreach ($n in 1..4) {
    $exe = Join-Path $build "autoteste_E$n.exe"
    g++ -std=c++17 -Wall -Wextra "-DESTACAO=$n" -I "$PSScriptRoot" "$PSScriptRoot\main.cpp" -o $exe
    if ($LASTEXITCODE -ne 0) { Write-Host "ERRO: nao compilou (E$n)" -ForegroundColor Red; exit 1 }
    if ($n -eq 1) { & $exe } else {
        $saida = & $exe
        $saida | Select-String 'FALHOU|=== Forno|Resultado' | ForEach-Object { "  E${n}: $($_.Line.Trim())" }
    }
    if ($LASTEXITCODE -ne 0) { Write-Host "ERRO: algum autoteste falhou (E$n)" -ForegroundColor Red; exit 1 }
}

# ---------- Etapa 2: chip do anemômetro ----------
Write-Host "`n### Etapa 2: chip do anemometro (gcc)" -ForegroundColor Cyan
$chip = Join-Path $build 'teste_chip.exe'
gcc -std=c11 -Wall -Wextra -I "$PSScriptRoot" "$PSScriptRoot\teste_chip.c" -o $chip
if ($LASTEXITCODE -ne 0) { Write-Host 'ERRO: o chip nao compilou' -ForegroundColor Red; exit 1 }
& $chip
if ($LASTEXITCODE -ne 0) { Write-Host 'ERRO: o chip nao gera os pulsos certos' -ForegroundColor Red; exit 1 }

# ---------- Etapa 3: compilar o firmware do ESP32 ----------
Write-Host "`n### Etapa 3: compilar o firmware do ESP32 (arduino-cli)" -ForegroundColor Cyan
# O arduino-cli exige que a pasta tenha o mesmo nome do .ino (sketch/sketch.ino),
# então copiamos só os arquivos do Wokwi para uma pasta temporária.
$sketch = Join-Path $build 'sketch'
New-Item -ItemType Directory -Force $sketch | Out-Null
Copy-Item "$edge\sketch.ino", "$edge\*.h" $sketch -Force
# Sem o secrets.h de verdade (ele fica fora do Git), compila com o modelo
if (-not (Test-Path "$edge\secrets.h")) {
    Copy-Item "$edge\secrets.example.h" "$sketch\secrets.h" -Force
    Write-Host 'secrets.h nao existe: compilando com o secrets.example.h' -ForegroundColor Yellow
}
arduino-cli compile --fqbn esp32:esp32:esp32 --warnings default $sketch
if ($LASTEXITCODE -ne 0) { Write-Host 'ERRO: o firmware nao compilou' -ForegroundColor Red; exit 1 }

Write-Host "`nTudo certo: autotestes e chip passaram, e o firmware compila." -ForegroundColor Green
