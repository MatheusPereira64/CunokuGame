package com.cunoku.game;

import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import java.io.File;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable allowAutoplayRunnable = this::allowMediaAutoplay;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Antes do WebView: o service worker da versão anterior sobrevive à troca do APK
        // e continua mostrando a versão antiga (ex.: 1.0.14 instalada, tela em 1.0.13).
        clearStaleWebCacheOnUpgrade();
        registerPlugin(AppUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
        enableImmersiveMode();
        scheduleAllowMediaAutoplay();
    }

    @Override
    public void onStart() {
        super.onStart();
        scheduleAllowMediaAutoplay();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enableImmersiveMode();
            scheduleAllowMediaAutoplay();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        enableImmersiveMode();
        scheduleAllowMediaAutoplay();
    }

    @Override
    public void onDestroy() {
        mainHandler.removeCallbacks(allowAutoplayRunnable);
        super.onDestroy();
    }

    /**
     * Apaga só o cache do WebView (service worker e HTTP cache) quando o versionCode muda.
     * Local Storage fica intacto: perfil e sessão não são apagados.
     */
    private void clearStaleWebCacheOnUpgrade() {
        try {
            int versionCode = currentVersionCode();
            SharedPreferences prefs = getSharedPreferences("cunoku_web_cache", MODE_PRIVATE);
            if (prefs.getInt("version_code", -1) == versionCode) return;

            File webviewDir = new File(getApplicationInfo().dataDir, "app_webview");
            deleteRecursive(new File(webviewDir, "Default/Service Worker"));
            deleteRecursive(new File(webviewDir, "Service Worker"));
            deleteRecursive(new File(webviewDir, "Default/Cache"));
            deleteRecursive(new File(webviewDir, "Default/Code Cache"));
            prefs.edit().putInt("version_code", versionCode).commit();
        } catch (Exception ignored) {
            // Se falhar, o próximo cold start tenta de novo
        }
    }

    @SuppressWarnings("deprecation")
    private int currentVersionCode() throws Exception {
        PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
        if (Build.VERSION.SDK_INT >= 28) {
            return (int) info.getLongVersionCode();
        }
        return info.versionCode;
    }

    private void deleteRecursive(File file) {
        if (file == null || !file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursive(child);
                }
            }
        }
        file.delete();
    }

    /** Bridge/WebView às vezes ainda é null no onCreate — tenta várias vezes. */
    private void scheduleAllowMediaAutoplay() {
        allowMediaAutoplay();
        View decor = getWindow() != null ? getWindow().getDecorView() : null;
        if (decor != null) {
            decor.post(allowAutoplayRunnable);
        }
        mainHandler.removeCallbacks(allowAutoplayRunnable);
        mainHandler.postDelayed(allowAutoplayRunnable, 100);
        mainHandler.postDelayed(allowAutoplayRunnable, 400);
        mainHandler.postDelayed(allowAutoplayRunnable, 1000);
    }

    /** Libera autoplay de áudio/vídeo sem gesto do usuário no WebView. */
    private void allowMediaAutoplay() {
        try {
            WebView webView = this.bridge != null ? this.bridge.getWebView() : null;
            if (webView == null) return;
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
        } catch (Exception ignored) {
            // Capacitor já define isso no Bridge; fallback silencioso se ainda não estiver pronto
        }
    }

    private void enableImmersiveMode() {
        // Conteúdo sob as barras do sistema (edge-to-edge)
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.hide(WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.navigationBars());
            // Sticky: some ao slide e esconde de novo sozinho
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
        } else {
            // Fallback API antiga
            final View decor = getWindow().getDecorView();
            decor.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            );
        }
    }
}
