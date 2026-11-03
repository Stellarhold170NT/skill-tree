# Chay skill-tree harness LOCAL (khong Docker) - Windows
#
# - DUNG CHUNG: runtime/workspace (file lam viec cua agent) + plugins/ + sdk/.
# - TACH RIENG: profile + sessions vao runtime/local-home/.dsh - vi profile pnpm
#   chua symlink do Docker (Linux) tao, Node native tren Windows khong doc duoc.
#   Doi mode khong mat FILE LAM VIEC; lich su session theo tung mode.
# - KHONG chay dong thoi 2 che do (trung port).
# - Khac biet voi docker: KHONG co bwrap sandbox + iptables (agent chay tran tren
#   Windows) - chi dung cho dev/demo nhanh. Production/agent that: dung docker.
#
# Dung:  .\run-local.ps1            -> port 8114 (tranh 8104 cua docker mode)
#        .\run-local.ps1 8120       -> port tuy chon
param([int]$Port = 8114)

$root = $PSScriptRoot
$env:DSH_HOME = Join-Path $root "runtime\local-home\.dsh"   # profile/session RIENG cho local
$env:NODE_ENV = "production"
# O C: von mong - de npm cache (npx) xuong E: cho chac
$env:npm_config_cache = "E:\npm-cache"

# --- Sync junctions: bat chuong bwrap bind cua docker mode ---
# Trong docker, bwrap bind cac package cua bundle dsh vao /app/plugins/node_modules
# de plugin load duoc @deepseek-ai/*. Local khong co bwrap - ta tao junction sang
# package trong npx cache (chi tao cai thieu; docker mode khong doc junctions nay).
$npxDsh = Get-ChildItem "$env:npm_config_cache\_npx" -Directory -ErrorAction SilentlyContinue |
  ForEach-Object { Join-Path $_.FullName "node_modules\@deepseek-ai\dsh" } |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if ($npxDsh) {
  # npx cai FLAT: moi package nam o <npx-entry>\node_modules\ (khong co dsh/node_modules
  # nhu npm -g trong container). Nguon junction = node_modules cua npx entry.
  $srcNm = Split-Path (Split-Path $npxDsh -Parent) -Parent
  $dstNm = Join-Path $root "plugins\node_modules"
  New-Item -ItemType Directory -Force -Path $dstNm | Out-Null
  Get-ChildItem $srcNm -Directory | ForEach-Object {
    if ($_.Name -like "@*") {
      Get-ChildItem $_.FullName -Directory | ForEach-Object {
        $link = Join-Path $dstNm "$($_.Parent.Name)\$($_.Name)"
        if (-not (Test-Path $link)) {
          New-Item -ItemType Directory -Force -Path (Split-Path $link) | Out-Null
          try { New-Item -ItemType Junction -Path $link -Target $_.FullName | Out-Null } catch {}
        }
      }
    } else {
      $link = Join-Path $dstNm $_.Name
      if (-not (Test-Path $link)) {
        try { New-Item -ItemType Junction -Path $link -Target $_.FullName | Out-Null } catch {}
      }
    }
  }
  Write-Host "[run-local] junctions synced tu npx bundle: $npxDsh"
} else {
  Write-Host "[run-local] CANH BAO: chua tim thay dsh trong npx cache, lan dau se sync lai sau"
}

Write-Host "[run-local] DSH_HOME=$env:DSH_HOME port=$Port"
Write-Host "[run-local] lan chay dau tien co the cho npx tai package (1-3 phut)..."

Push-Location (Join-Path $root "runtime\workspace")
try {
  npx -y @deepseek-ai/dsh@0.1.5-rc.3 --profile web `
    --patch (Join-Path $root "plugins\patch.local.yml") `
    --port $Port --no-open `
    --trusted-host "localhost:$port" "127.0.0.1:$port"
}
finally { Pop-Location }
