#!/usr/bin/env bash
# Compila o app Capacitor para iOS Simulator (sem certificado Apple).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/ios/App"
mkdir -p "$ROOT/release-artifacts"

SPM="$ROOT/ios/App/CapApp-SPM/Package.swift"
if [[ -f "$SPM" ]]; then
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

echo "==> available simulators"
xcrun simctl list devices available || true

DESTINATION="platform=iOS Simulator,name=iPhone 16"
if ! xcrun simctl list devices available | grep -q "iPhone 16"; then
  if xcrun simctl list devices available | grep -q "iPhone 15"; then
    DESTINATION="platform=iOS Simulator,name=iPhone 15"
  else
    NAME="$(xcrun simctl list devices available | awk -F'[()]' '/iPhone/{gsub(/^ +| +$/,"",$1); print $1; exit}')"
    if [[ -n "${NAME:-}" ]]; then
      DESTINATION="platform=iOS Simulator,name=${NAME}"
    else
      DESTINATION="generic/platform=iOS Simulator"
    fi
  fi
fi
echo "==> destination: ${DESTINATION}"

LOG="$ROOT/ios/App/xcodebuild.log"
set +e
xcodebuild \
  -project App.xcodeproj \
  -scheme App \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "${DESTINATION}" \
  -derivedDataPath "$ROOT/ios/App/derived-sim" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY=- \
  CODE_SIGN_STYLE=Manual \
  DEVELOPMENT_TEAM= \
  COMPILER_INDEX_STORE_ENABLE=NO \
  ONLY_ACTIVE_ARCH=YES \
  build 2>&1 | tee "$LOG"
XC=${PIPESTATUS[0]}
set -e

if [[ "$XC" -ne 0 ]]; then
  echo "==> xcodebuild failed (${XC}); filtered errors:"
  grep -E "error:|fatal error|Unable to find a destination|requires a development team|AppIcon" "$LOG" | tail -100 || true
  exit "$XC"
fi

APP_PATH="$(find "$ROOT/ios/App/derived-sim/Build/Products" -name "App.app" -print -quit)"
if [[ -z "$APP_PATH" ]]; then
  echo "App.app not found under derived-sim"
  find "$ROOT/ios/App/derived-sim" -name "*.app" || true
  exit 1
fi

STAGE="$(mktemp -d)"
cp -R "$APP_PATH" "$STAGE/App.app"
(
  cd "$STAGE"
  zip -r "$ROOT/release-artifacts/Cunoku-1.0.3-ios-simulator.zip" App.app
)
ls -lh "$ROOT/release-artifacts/Cunoku-1.0.3-ios-simulator.zip"
