#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUNDLE="$SCRIPT_DIR/build/Mare Infinitus.saver"
INSTALL_DIR="$HOME/Library/Screen Savers"
DESTINATION="$INSTALL_DIR/Mare Infinitus.saver"

if [[ ! -d "$BUNDLE" ]]; then
  bash "$SCRIPT_DIR/build.sh"
fi

mkdir -p "$INSTALL_DIR"
rm -rf "$DESTINATION"
ditto "$BUNDLE" "$DESTINATION"

echo "Installed $DESTINATION"
echo "Open System Settings → Screen Saver and choose Mare Infinitus."
