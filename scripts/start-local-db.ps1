$ErrorActionPreference = 'Stop'
$campusRoot = Split-Path -Parent $PSScriptRoot
if ((git -C $campusRoot remote get-url origin) -ne 'https://github.com/Siddharth1968/lost-and-found.git') { throw 'Wrong repository. Refusing to launch database.' }
$campusServer = Join-Path $campusRoot '.local/mysql-8.4.6-winx64/bin/mysqld.exe'
$campusData = Join-Path $campusRoot '.local/mysql-data'
if (!(Test-Path -LiteralPath $campusServer) -or !(Test-Path -LiteralPath $campusData)) { throw 'This optional script requires the already-provisioned project-local MySQL instance. Follow README for a fresh setup.' }
# Foreground process; no Windows service, global PATH/config, or other instance is touched.
& $campusServer --no-defaults "--basedir=$campusRoot/.local/mysql-8.4.6-winx64" "--datadir=$campusData" --port=3307 --bind-address=127.0.0.1 --mysqlx=0 --log-bin-trust-function-creators=1 --console
