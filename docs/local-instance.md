# Isolated instance used for verification

This machine had no detected MySQL executable/service or Docker command. An official MySQL Community 8.4.6 Windows ZIP was downloaded from Oracle's CDN and extracted **inside this repository's ignored `.local` directory**. It was initialized as a new instance, never as a Windows service, with no global installation or PATH change.

- Checkout: `C:\Users\asus\CampusFindWorkspace\lost-and-found`
- Bind: `127.0.0.1:3307`, MySQL X protocol disabled.
- Data: `.local/mysql-data`; server `--no-defaults` prevents reading other instance configuration.
- Application database/account: `campusfind` / `campusfind`.
- Test database/account: `campusfind_test` / `campusfind_test`.
- Both accounts have privileges only on their respective CampusFind databases.
- Root/app/test/demo/admin passwords were independently generated. The initially blank root account was secured immediately during bootstrap. Secrets are in ignored `server/.env`, `server/.env.test`, and `.local/credentials.json`. Never publish/copy these files to another project.
- The explicit demo administrator is `admin@example.test`; no public default password exists. Its generated password is stored only in the ignored local credentials file.

To restart the already-provisioned instance, run `powershell -File scripts/start-local-db.ps1` from the repository root in its own terminal. Keep it running, then use `npm run dev` in another terminal. The script uses a foreground process and only this repository's data directory. Stop it with Ctrl+C in its own terminal. Do not point the script at an existing database directory or port used by another application. A binary-log trigger-creation setting is supplied only to this dedicated process.

If Windows policy blocks `.ps1` files, keep the policy unchanged. The equivalent foreground command can be entered directly in a PowerShell terminal from this exact checkout:

```powershell
Set-Location -LiteralPath 'C:\Users\asus\CampusFindWorkspace\lost-and-found'
git rev-parse --show-toplevel
git remote -v
# Continue only if these identify the independent lost-and-found checkout above.
& '.\.local\mysql-8.4.6-winx64\bin\mysqld.exe' --no-defaults '--basedir=C:/Users/asus/CampusFindWorkspace/lost-and-found/.local/mysql-8.4.6-winx64' '--datadir=C:/Users/asus/CampusFindWorkspace/lost-and-found/.local/mysql-data' --port=3307 --bind-address=127.0.0.1 --mysqlx=0 --log-bin-trust-function-creators=1 --console
```

This direct command was used successfully during the 2.0 verification. In a second terminal in the same checkout, run `npm run dev` and open `http://localhost:5173`. The temporary verification processes were stopped after QA; the instance and its data are retained.

For another computer, use the normal MySQL installation/setup instructions in README. `.local` is machine-specific runtime state, intentionally absent from Git. Backups and production deployment remain operator responsibilities. No other project's files, services, database or credentials were used.
