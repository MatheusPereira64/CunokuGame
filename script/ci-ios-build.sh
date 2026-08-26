#!/usr/bin/env bash
# Compila o app Capacitor (simulador, sem certificado Apple) e gera Cunoku-1.0.3.ipa
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

echo "==> Xcode / SDKs"
xcodebuild -version || true
xcodebuild -showsdks || true
echo "==> schemes"
xcodebuild -project App.xcodeproj -list || true
echo "==> simulators"
xcrun simctl list devices available || true

SIM_DEST="generic/platform=iOS Simulator"
if xcrun simctl list devices available | grep -q "iPhone 16"; then
  SIM_DEST="platform=iOS Simulator,name=iPhone 16"
elif xcrun simctl list devices available | grep -q "iPhone 15"; then
  SIM_DEST="platform=iOS Simulator,name=iPhone 15"
elif xcrun simctl list devices available | grep -q "iPhone 14"; then
  SIM_DEST="platform=iOS Simulator,name=iPhone 14"
fi
echo "==> destination: $SIM_DEST"

DERIVED="$ROOT/ios/App/derived-sim"
LOG="$ROOT/release-artifacts/xcodebuild.log"
rm -rf "$DERIVED"

echo "==> resolve Swift packages"
xcodebuild \
  -project App.xcodeproj \
  -scheme App \
  -resolvePackageDependencies \
  -derivedDataPath "$DERIVED" \
  -skipPackagePluginValidation || true

set +e
xcodebuild \
  -project App.xcodeproj \
  -scheme App \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "$SIM_DEST" \
  -derivedDataPath "$DERIVED" \
  -skipPackagePluginValidation \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY=- \
  CODE_SIGN_STYLE=Manual \
  DEVELOPMENT_TEAM= \
  PROVISIONING_PROFILE_SPECIFIER= \
  COMPILER_INDEX_STORE_ENABLE=NO \
  ONLY_ACTIVE_ARCH=YES \
  build 2>&1 | tee "$LOG"
XC=${PIPESTATUS[0]}
set -e

if [[ "$XC" -ne 0 ]]; then
  echo "==> xcodebuild failed with exit $XC"
  echo "==> filtered errors:"
  grep -E "error:|fatal error|Unable to find|requires a development team|AppIcon|No profiles|provisioning|destination|package|SPM|Swift" "$LOG" | tail -150 || true
  echo "==> last 80 lines:"
  tail -80 "$LOG" || true
  exit "$XC"
fi

APP_PATH="$(find "$DERIVED/Build/Products" -name "App.app" -print -quit || true)"
if [[ -z "$APP_PATH" ]]; then
  echo "App.app not found under $DERIVED"
  find "$DERIVED" -name "*.app" || true
  exit 1
fi
echo "==> using $APP_PATH"

STAGE="$(mktemp -d)"
mkdir -p "$STAGE/Payload"
cp -R "$APP_PATH" "$STAGE/Payload/Cunoku.app"
(
  cd "$STAGE"
  zip -y -r "$ROOT/release-artifacts/Cunoku-1.0.3.ipa" Payload
)
ls -lh "$ROOT/release-artifacts/Cunoku-1.0.3.ipa"
