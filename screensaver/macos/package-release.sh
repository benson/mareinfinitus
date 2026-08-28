#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUNDLE="$SCRIPT_DIR/build/Mare Infinitus.saver"
RELEASE_DIR="$SCRIPT_DIR/release"
ZIP_PATH="$RELEASE_DIR/Mare-Infinitus-macOS.zip"
IDENTITY="${DEVELOPER_ID_APPLICATION:-}"
NOTARY_PROFILE="${NOTARY_PROFILE:-}"

if [[ -z "$IDENTITY" ]]; then
  echo "Set DEVELOPER_ID_APPLICATION to a Developer ID Application signing identity." >&2
  exit 1
fi

bash "$SCRIPT_DIR/build.sh"
codesign --force --options runtime --timestamp --sign "$IDENTITY" "$BUNDLE"
codesign --verify --deep --strict --verbose=2 "$BUNDLE"

mkdir -p "$RELEASE_DIR"
rm -f "$ZIP_PATH"
ditto -c -k --sequesterRsrc --keepParent "$BUNDLE" "$ZIP_PATH"

if [[ -n "$NOTARY_PROFILE" ]]; then
  xcrun notarytool submit "$ZIP_PATH" --keychain-profile "$NOTARY_PROFILE" --wait
  xcrun stapler staple "$BUNDLE"
  rm -f "$ZIP_PATH"
  ditto -c -k --sequesterRsrc --keepParent "$BUNDLE" "$ZIP_PATH"
else
  echo "NOTARY_PROFILE is unset; created a signed but unnotarized archive." >&2
fi

echo "Packaged $ZIP_PATH"
