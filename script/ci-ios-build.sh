#!/usr/bin/env bash
# Compila o app Capacitor (simulador, sem certificado Apple) e gera Cunoku-1.0.3.ipa
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/ios/App"
mkdir -p "$ROOT/release-artifacts"

# Capacitor regenera CapApp-SPM/Package.swift no sync. Em path packages o SwiftPM
# usa o nome da pasta ("app"), não o name do Package.swift ("CapacitorApp").
if [[ -f "$ROOT/ios/App/CapApp-SPM/Package.swift" ]]; then
  python3 - <<'PY'
from pathlib import Path
p = Path("CapApp-SPM/Package.swift")
text = p.read_text(encoding="utf-8")
# Normalize Windows paths Capacitor may emit on some hosts
text2 = text.replace(r"..\..\..\node_modules\@capacitor\app", "../../../node_modules/@capacitor/app")
text2 = text2.replace('.package(name: "CapacitorApp", path: "../../../node_modules/@capacitor/app")',
                      '.package(path: "../../../node_modules/@capacitor/app")')
# Critical: package identity for path deps is the directory name "app"
text2 = text2.replace('.product(name: "CapacitorApp", package: "CapacitorApp")',
                      '.product(name: "CapacitorApp", package: "app")')
if text2 != text:
    p.write_text(text2, encoding="utf-8")
    print("patched CapApp-SPM/Package.swift for SwiftPM path package id 'app'")
else:
    print("CapApp-SPM/Package.swift already patched")
print(p.read_text(encoding="utf-8"))
PY
fi

echo "==> Xcode"
xcodebuild -version || true
echo "==> schemes"
xcodebuild -project App.xcodeproj -list || true
echo "==> simulators"
xcrun simctl list devices available || true

# Xcode 15.4 on macos-14 typically has iPhone 15, not 16.
SIM_DEST="generic/platform=iOS Simulator"
if xcrun simctl list devices available | grep -q "iPhone 15"; then
  SIM_DEST="platform=iOS Simulator,name=iPhone 15"
elif xcrun simctl list devices available | grep -q "iPhone 16"; then
  SIM_DEST="platform=iOS Simulator,name=iPhone 16"
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
  -skipPackagePluginValidation 2>&1 | tee "$ROOT/release-artifacts/xcodebuild-resolve.log" || true

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
  grep -E "error:|fatal error|unknown package|Unable to find|AppIcon|destination|package" "$LOG" | tail -150 || true
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
