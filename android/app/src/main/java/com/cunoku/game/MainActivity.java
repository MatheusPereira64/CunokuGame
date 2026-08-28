package com.cunoku.game;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable allowAutoplayRunnable = this::allowMediaAutoplay;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
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
