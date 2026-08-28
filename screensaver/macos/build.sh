#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_ROOT="${BUILD_ROOT:-$SCRIPT_DIR/build}"
BUNDLE_NAME="Mare Infinitus.saver"
BUNDLE="$BUILD_ROOT/$BUNDLE_NAME"
CONTENTS="$BUNDLE/Contents"
WEB="$CONTENTS/Resources/Web"
EXECUTABLE="$CONTENTS/MacOS/MareInfinitus"

required_assets=(
  "index.html"
  "style.css"
  "app.js"
  "systems/creature-variation.js"
  "systems/ecology.js"
  "systems/ambient-life.js"
  "systems/light-field.js"
  "systems/motion-engine.js"
  "systems/world-physics.js"
  "systems/scene-engine.js"
  "systems/event-director.js"
)

for asset in "${required_assets[@]}"; do
  if [[ ! -f "$PROJECT_ROOT/$asset" ]]; then
    echo "Missing required web asset: $PROJECT_ROOT/$asset" >&2
    exit 1
  fi
done

if ! command -v xcrun >/dev/null 2>&1; then
  echo "xcrun was not found. Install Xcode and select it with xcode-select." >&2
  exit 1
fi

rm -rf "$BUNDLE"
mkdir -p "$CONTENTS/MacOS" "$WEB"

cp "$SCRIPT_DIR/Resources/Info.plist" "$CONTENTS/Info.plist"
cp "$PROJECT_ROOT/index.html" "$PROJECT_ROOT/style.css" "$PROJECT_ROOT/app.js" "$WEB/"
ditto "$PROJECT_ROOT/systems" "$WEB/systems"
if [[ -d "$PROJECT_ROOT/public" ]]; then
  ditto "$PROJECT_ROOT/public" "$WEB/public"
fi

SDK_PATH="$(xcrun --sdk macosx --show-sdk-path)"
xcrun --sdk macosx clang \
  -arch arm64 \
  -arch x86_64 \
  -isysroot "$SDK_PATH" \
  -mmacosx-version-min=12.0 \
  -fobjc-arc \
  -fmodules \
  -Wall \
  -Wextra \
  -Werror \
  -bundle \
  -framework Cocoa \
  -framework ScreenSaver \
  -framework WebKit \
  "$SCRIPT_DIR/Sources/MareInfinitusView.m" \
  -o "$EXECUTABLE"

plutil -lint "$CONTENTS/Info.plist"
codesign --force --sign - --timestamp=none "$BUNDLE"
codesign --verify --deep --strict "$BUNDLE"

echo "Built $BUNDLE"
echo "Architectures: $(lipo -archs "$EXECUTABLE")"
