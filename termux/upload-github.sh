#!/data/data/com.termux/files/usr/bin/bash
# termux/upload-github.sh — unggah proyek HEYGAMMER ke GitHub dari Termux.
#
#   bash termux/upload-github.sh https://github.com/USERNAME/heygammer.git
#
# Skrip ini TIDAK menyimpan username/password/token. Saat push pertama kali,
# Git akan meminta login: gunakan Personal Access Token (PAT) sebagai password.
# Atau pasang GitHub CLI (pkg install gh) lalu jalankan `gh auth login` sekali.
set -e

REMOTE="$1"
if [ -z "$REMOTE" ]; then
  echo "Pemakaian: bash termux/upload-github.sh <url-repo-github>" >&2
  echo "Contoh   : bash termux/upload-github.sh https://github.com/USERNAME/heygammer.git" >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "Memasang git..."
  pkg install -y git
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .gitignore ]; then
  cat > .gitignore <<'GI'
node_modules/
tests/screenshots/
.DS_Store
*.log
GI
fi

if [ ! -d .git ]; then
  git init -b main
fi

git config user.name  >/dev/null 2>&1 || { read -r -p "Nama untuk commit: " NAME; git config user.name "$NAME"; }
git config user.email >/dev/null 2>&1 || { read -r -p "Email untuk commit: " MAIL; git config user.email "$MAIL"; }

git add -A
if git diff --cached --quiet; then
  echo "Tidak ada perubahan baru untuk di-commit."
else
  git commit -m "HEYGAMMER v8: tahap 1-8 (dashboard, intro 3D, 13 game, Game Mode, uji otomatis)"
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE"
else
  git remote add origin "$REMOTE"
fi

echo "Mengunggah ke $REMOTE ..."
git push -u origin main
echo "Selesai. Aktifkan GitHub Pages di Settings > Pages bila ingin dihosting."
