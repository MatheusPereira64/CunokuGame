#!/usr/bin/env bash
# Compila o app Capacitor e empacota Cunoku-1.0.3.ipa (sem certificado Apple).
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/ios/App"
mkdir -p "$ROOT/release-artifacts"

if [[ -f "$ROOT/ios/App/CapApp-SPM/Package.swift" ]]; then
  python3 - <<'PY'
from pathlib import Path
p = Path("CapApp-SPM/Package.swift")
text = p.read_text(encoding="utf-8")
old = '.package(name: "CapacitorApp", path: "../../../node_modules/@capacitor/app")'
new = '.package(path: "../../../node_modules/@capacitor/app")'
if old in text:
    p.write_text(text.replace(old, new), encoding="utf-8")
    print("patched CapApp-SPM/Package.swift path package")
PY
fi

echo "==> xcodebuild -list"
xcodebuild -project App.xcodeproj -scheme App -list || true
echo "==> simulators"
xcrun simctl list devices available || true

pick_sim() {
  if xcrun simctl list devices available | grep -q "iPhone 16"; then
    echo "platform=iOS Simulator,name=iPhone 16"
  elif xcrun simctl list devices available | grep -q "iPhone 15"; then
    echo "platform=iOS Simulator,name=iPhone 15"
  else
    echo "generic/platform=iOS Simulator"
  fi
}

build_app() {
  local sdk="$1"
  local dest="$2"
  local derived="$3"
  echo "==> xcodebuild sdk=$sdk dest=$dest"
  xcodebuild \
    -project App.xcodeproj \
    -scheme App \
    -configuration Debug \
    -sdk "$sdk" \
    -destination "$dest" \
    -derivedDataPath "$derived" \
    CODE_SIGNING_ALLOWED=NO \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGN_IDENTITY="" \
    CODE_SIGN_STYLE=Manual \
    COMPILER_INDEX_STORE_ENABLE=NO \
    ONLY_ACTIVE_ARCH=YES \
    build
}

DERIVED_DEV="$ROOT/ios/App/derived-device"
DERIVED_SIM="$ROOT/ios/App/derived-sim"
APP_PATH=""

if build_app iphoneos "generic/platform=iOS" "$DERIVED_DEV"; then
  APP_PATH="$(find "$DERIVED_DEV/Build/Products" -name "App.app" -print -quit || true)"
else
  echo "==> device build failed; trying iOS Simulator"
  SIM_DEST="$(pick_sim)"
  echo "==> simulator destination: $SIM_DEST"
  build_app iphonesimulator "$SIM_DEST" "$DERIVED_SIM"
  APP_PATH="$(find "$DERIVED_SIM/Build/Products" -name "App.app" -print -quit || true)"
fi

if [[ -z "$APP_PATH" ]]; then
  echo "App.app not found"
  exit 1
fi
echo "==> using $APP_PATH"

STAGE="$(mktemp -d)"
mkdir -p "$STAGE/Payload"
cp -R "$APP_PATH" "$STAGE/Payload/App.app"
(
  cd "$STAGE"
  zip -y -r "$ROOT/release-artifacts/Cunoku-1.0.3.ipa" Payload
)
ls -lh "$ROOT/release-artifacts/Cunoku-1.0.3.ipa"
