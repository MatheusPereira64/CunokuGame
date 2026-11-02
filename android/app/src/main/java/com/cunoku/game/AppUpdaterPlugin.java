package com.cunoku.game;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Baixa o APK da release e abre o instalador do Android. */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private static final String APK_MIME = "application/vnd.android.package-archive";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private File apkFile() {
        return new File(new File(getContext().getCacheDir(), "updates"), "cunoku-update.apk");
    }

    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.startsWith("https://")) {
            call.reject("invalid_url");
            return;
        }
        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                File target = apkFile();
                File dir = target.getParentFile();
                if (dir != null && !dir.exists() && !dir.mkdirs()) throw new IOException("mkdir failed");
                File partial = new File(dir, target.getName() + ".part");

                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                int status = conn.getResponseCode();
                if (status < 200 || status >= 300) throw new IOException("HTTP " + status);

                long total = conn.getContentLengthLong();
                long done = 0;
                int lastPercent = -1;
                try (InputStream in = new BufferedInputStream(conn.getInputStream());
                     OutputStream out = new FileOutputStream(partial)) {
                    byte[] buffer = new byte[64 * 1024];
                    int read;
                    while ((read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                        done += read;
                        int percent = total > 0 ? (int) (done * 100 / total) : -1;
                        if (percent != lastPercent) {
                            lastPercent = percent;
                            JSObject progress = new JSObject();
                            progress.put("downloaded", done);
                            progress.put("total", total);
                            progress.put("percent", percent);
                            notifyListeners("progress", progress);
                        }
                    }
                }

                if (target.exists() && !target.delete()) throw new IOException("delete failed");
                if (!partial.renameTo(target)) throw new IOException("rename failed");

                JSObject result = new JSObject();
                result.put("path", target.getAbsolutePath());
                call.resolve(result);
            } catch (Exception e) {
                call.reject("download_failed", e);
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }

    @PluginMethod
    public void install(PluginCall call) {
        File apk = apkFile();
        if (!apk.exists()) {
            call.reject("missing_apk");
            return;
        }
        Context context = getContext();
        JSObject result = new JSObject();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && !context.getPackageManager().canRequestPackageInstalls()) {
            Intent settings = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + context.getPackageName())
            );
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(settings);
            result.put("started", false);
            result.put("needsPermission", true);
            call.resolve(result);
            return;
        }

        Uri uri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", apk);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, APK_MIME);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
        result.put("started", true);
        result.put("needsPermission", false);
        call.resolve(result);
    }
}
