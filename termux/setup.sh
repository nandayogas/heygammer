#!/data/data/com.termux/files/usr/bin/bash
# termux/setup.sh — jalankan HEYGAMMER di Android lewat Termux.
#
#   bash termux/setup.sh            # pasang Python lalu jalankan server di port 8080
#   bash termux/setup.sh --port 9000
#
# Setelah server jalan, buka Chrome di HP dan kunjungi http://127.0.0.1:8080
# (Three.js dan Firebase dimuat dari internet, jadi HP perlu koneksi.)
set -e

PORT=8080
if [ "$1" = "--port" ] && [ -n "$2" ]; then PORT="$2"; fi

if ! command -v python >/dev/null 2>&1; then
  echo "[1/3] Memasang Python..."
  pkg update -y
  pkg install -y python
else
  echo "[1/3] Python sudah terpasang."
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ ! -f "$ROOT/index.html" ] || [ ! -f "$ROOT/js/app.js" ]; then
  echo "Folder proyek tidak lengkap di: $ROOT" >&2
  exit 1
fi

echo "[2/3] Folder proyek: $ROOT"
cd "$ROOT"

echo "[3/3] Server berjalan di http://127.0.0.1:$PORT"
echo "      Buka alamat itu di Chrome. Tekan Ctrl+C untuk berhenti."
if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "http://127.0.0.1:$PORT" || true
fi
exec python -m http.server "$PORT" --bind 127.0.0.1
