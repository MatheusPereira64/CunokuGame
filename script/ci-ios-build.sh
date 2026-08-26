#!/usr/bin/env bash
# Compila o app Capacitor (simulador, sem certificado Apple) e gera o IPA
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/ios/App"
mkdir -p "$ROOT/release-artifacts"

VERSION="${APP_VERSION:-}"
VERSION="${VERSION#v}"
if [[ -z "$VERSION" ]]; then
  VERSION="$(node -p "require('$ROOT/package.json').version")"
fi
IPA_NAME="Cunoku-${VERSION}.ipa"

# Capacitor sync regenera CapApp-SPM. No Xcode 15.4 o plugin @capacitor/app falha
# (CAPPluginCall.reject) com capacitor-swift-pm 8.5 — o app web não usa esse plugin.
cat > CapApp-SPM/Package.swift <<'EOF'
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.0")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ]
        )
    ]
)
EOF
echo "==> CapApp-SPM/Package.swift (core only):"
cat CapApp-SPM/Package.swift

echo "==> Xcode"
xcodebuild -version || true
echo "==> simulators"
xcrun simctl list devices available || true

SIM_DEST="generic/platform=iOS Simulator"
if xcrun simctl list devices available | grep -q "iPhone 15"; then
  SIM_DEST="platform=iOS Simulator,name=iPhone 15,OS=18.2"
elif xcrun simctl list devices available | grep -q "iPhone 16"; then
  SIM_DEST="platform=iOS Simulator,name=iPhone 16"
elif xcrun simctl list devices available | grep -q "iPhone 14"; then
  SIM_DEST="platform=iOS Simulator,name=iPhone 14"
fi
echo "==> destination: $SIM_DEST"
echo "==> IPA: $IPA_NAME"

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
  grep -E "error:|fatal error|unknown package|Unable to find|AppIcon|destination|BUILD FAILED" "$LOG" | tail -150 || true
  tail -60 "$LOG" || true
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
  zip -y -r "$ROOT/release-artifacts/$IPA_NAME" Payload
)
ls -lh "$ROOT/release-artifacts/$IPA_NAME"
