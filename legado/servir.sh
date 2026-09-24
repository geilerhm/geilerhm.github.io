#!/bin/sh
# Ejecuta: sh servir.sh    y abre http://localhost:8000
cd "$(dirname "$0")"
python3 -m http.server 8000
