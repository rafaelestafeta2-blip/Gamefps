import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');
const stylesPath = path.resolve('android/app/src/main/res/values/styles.xml');
const javaSrcRoot = path.resolve('android/app/src/main/java');

// ============================================================================
// 1. Patch AndroidManifest.xml (VIBRATE, sensorLandscape, hardwareAccelerated)
// ============================================================================
if (fs.existsSync(manifestPath)) {
  let content = fs.readFileSync(manifestPath, 'utf8');

  if (!content.includes('android.permission.VIBRATE')) {
    content = content.replace(
      '</manifest>',
      '    <uses-permission android:name="android.permission.VIBRATE" />\n</manifest>'
    );
  }

  if (content.includes('android:screenOrientation=')) {
    content = content.replace(
      /android:screenOrientation="[^"]*"/g,
      'android:screenOrientation="sensorLandscape"'
    );
  } else {
    content = content.replace(
      '<activity',
      '<activity android:screenOrientation="sensorLandscape"'
    );
  }

  if (!content.includes('android:hardwareAccelerated=')) {
    content = content.replace(
      '<activity',
      '<activity android:hardwareAccelerated="true"'
    );
  } else {
    content = content.replace(
      /android:hardwareAccelerated="[^"]*"/g,
      'android:hardwareAccelerated="true"'
    );
  }

  fs.writeFileSync(manifestPath, content, 'utf8');
  console.log('[patch-manifest] Patched AndroidManifest.xml (Landscape + Haptics + GPU)');
} else {
  console.log(`[patch-manifest] Manifest file not found at ${manifestPath}, skipping.`);
}

// ============================================================================
// 2. Patch res/values/styles.xml (Fullscreen & Display Cutout ShortEdges)
// ============================================================================
if (fs.existsSync(stylesPath)) {
  let styles = fs.readFileSync(stylesPath, 'utf8');
  const fullscreenItems = `
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionBar">false</item>
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowContentOverlay">@null</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>`;

  if (!styles.includes('android:windowLayoutInDisplayCutoutMode')) {
    styles = styles.replace(
      /<style name="AppTheme\.NoActionBar"[^>]*>/,
      (match) => `${match}${fullscreenItems}`
    );
    fs.writeFileSync(stylesPath, styles, 'utf8');
    console.log('[patch-manifest] Patched styles.xml with Fullscreen + shortEdges cutout');
  }
}

// ============================================================================
// 3. Patch MainActivity.java (Sticky Immersive + In-App Native Google OAuth)
// ============================================================================
function findMainActivity(dir) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findMainActivity(fullPath);
      if (found) return found;
    } else if (entry.name === 'MainActivity.java') {
      return fullPath;
    }
  }
  return null;
}

const mainActivityPath = findMainActivity(javaSrcRoot);
if (mainActivityPath) {
  const rawJava = fs.readFileSync(mainActivityPath, 'utf8');
  const pkgMatch = rawJava.match(/package\s+([a-zA-Z0-9_.]+);/);
  const pkgName = pkgMatch ? pkgMatch[1] : 'com.kineticlabs.tacticalfps';

  const immersiveMainActivity = `package ${pkgName};

import android.annotation.SuppressLint;
import android.app.Dialog;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final String CHROME_MOBILE_UA =
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36";

    private Dialog oauthDialog;
    private WebView oauthWebView;
    private boolean oauthResultDelivered = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        hideSystemBarsImmersive();

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView mainWebView = getBridge().getWebView();
            WebSettings settings = mainWebView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setUserAgentString(CHROME_MOBILE_UA);
            CookieManager.getInstance().setAcceptCookie(true);
            CookieManager.getInstance().setAcceptThirdPartyCookies(mainWebView, true);
            mainWebView.addJavascriptInterface(new KineticNativeAuthBridge(), "KineticNativeAuth");
        }
    }

    private boolean isOAuthCallback(String url) {
        if (url == null || !url.contains("/__/auth/handler")) return false;
        return url.contains("code=")
            || url.contains("id_token=")
            || url.contains("access_token=")
            || url.contains("error=");
    }

    private boolean isGoogleAuthHost(String host) {
        if (host == null) return false;
        return host.equals("accounts.google.com")
            || host.equals("google.com")
            || host.equals("googleapis.com")
            || host.equals("gstatic.com")
            || host.endsWith(".google.com")
            || host.endsWith(".googleapis.com")
            || host.endsWith(".gstatic.com");
    }

    public class KineticNativeAuthBridge {
        @JavascriptInterface
        public void startGoogleSignIn(final String oauthUrl) {
            runOnUiThread(() -> openInAppGoogleOAuthDialog(oauthUrl));
        }
    }

    public class KineticPopupBridge {
        @JavascriptInterface
        public void onCallbackUrl(final String callbackUrl) {
            runOnUiThread(() -> deliverOAuthUrlToMainWebView(callbackUrl));
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void openInAppGoogleOAuthDialog(String oauthUrl) {
        closeOAuthDialogCleanly();
        oauthResultDelivered = false;

        oauthDialog = new Dialog(this, android.R.style.Theme_Black_NoTitleBar_Fullscreen);
        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setBackgroundColor(Color.parseColor("#06080c"));

        LinearLayout headerBar = new LinearLayout(this);
        headerBar.setOrientation(LinearLayout.HORIZONTAL);
        headerBar.setGravity(Gravity.CENTER_VERTICAL);
        headerBar.setBackgroundColor(Color.parseColor("#0c111a"));
        int padH = (int) (14 * getResources().getDisplayMetrics().density);
        int padV = (int) (8 * getResources().getDisplayMetrics().density);
        headerBar.setPadding(padH, padV, padH, padV);

        TextView titleView = new TextView(this);
        titleView.setText("AUTENTICAÇÃO GOOGLE · KINETIC CLOUD");
        titleView.setTextColor(Color.parseColor("#fbbf24"));
        titleView.setTextSize(12f);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
            0,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            1f
        );
        headerBar.addView(titleView, titleParams);

        Button closeBtn = new Button(this);
        closeBtn.setText("CANCELAR ✕");
        closeBtn.setTextColor(Color.WHITE);
        closeBtn.setTextSize(11f);
        closeBtn.setBackgroundColor(Color.parseColor("#1e293b"));
        closeBtn.setOnClickListener(v -> cancelOAuthFlow());
        headerBar.addView(closeBtn);

        rootLayout.addView(
            headerBar,
            new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        );

        oauthWebView = new WebView(this);
        WebSettings ws = oauthWebView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setUserAgentString(CHROME_MOBILE_UA);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(oauthWebView, true);
        oauthWebView.addJavascriptInterface(new KineticPopupBridge(), "KineticPopupBridge");

        oauthWebView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String reqUrl = request.getUrl().toString();
                if (reqUrl.contains("/__/auth/handler")) {
                    String html = "<!DOCTYPE html><html><head><meta charset='utf-8'></head>"
                        + "<body style='background:#06080c;color:#fbbf24;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;'>"
                        + "<div>AUTENTICANDO CONTA GOOGLE NO KINETIC...</div>"
                        + "<script>(function(){var href=window.location.href;if(!window.KineticPopupBridge)return;"
                        + "if(href.indexOf('code=')<0&&href.indexOf('id_token=')<0&&href.indexOf('access_token=')<0&&href.indexOf('error=')<0)return;"
                        + "window.KineticPopupBridge.onCallbackUrl(href);})();</script>"
                        + "</body></html>";
                    return new WebResourceResponse(
                        "text/html",
                        "UTF-8",
                        new ByteArrayInputStream(html.getBytes(StandardCharsets.UTF_8))
                    );
                }
                WebResourceResponse proxied = proxyGoogleGet(request);
                if (proxied != null) return proxied;
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (isOAuthCallback(url)) {
                    deliverOAuthUrlToMainWebView(url);
                    return true;
                }
                if (url.startsWith("https://") || url.startsWith("http://")) {
                    return false;
                }
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                if (isOAuthCallback(url)) {
                    deliverOAuthUrlToMainWebView(url);
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (isOAuthCallback(url)) {
                    deliverOAuthUrlToMainWebView(url);
                    return;
                }
                if (url != null && url.contains("/__/auth/handler")) {
                    view.evaluateJavascript(
                        "(function(){return window.location.href;})()",
                        val -> {
                            if (val == null) return;
                            String unquoted = val;
                            if (unquoted.length() >= 2 && unquoted.charAt(0) == '"' && unquoted.charAt(unquoted.length() - 1) == '"') {
                                unquoted = unquoted.substring(1, unquoted.length() - 1);
                            }
                            if (isOAuthCallback(unquoted)) {
                                deliverOAuthUrlToMainWebView(unquoted);
                            }
                        }
                    );
                }
            }
        });

        rootLayout.addView(
            oauthWebView,
            new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
        );

        oauthDialog.setContentView(rootLayout);
        oauthDialog.setOnCancelListener(d -> cancelOAuthFlow());
        oauthDialog.show();
        oauthWebView.loadUrl(oauthUrl);
    }

    private WebResourceResponse proxyGoogleGet(WebResourceRequest request) {
        if (request == null || request.getUrl() == null) return null;
        if (!"GET".equalsIgnoreCase(request.getMethod())) return null;
        String url = request.getUrl().toString();
        if (url.contains("/__/auth/handler")) return null;
        if (!isGoogleAuthHost(request.getUrl().getHost())) return null;

        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(20000);
            conn.setRequestProperty("User-Agent", CHROME_MOBILE_UA);
            Map<String, String> headers = request.getRequestHeaders();
            if (headers != null) {
                for (Map.Entry<String, String> entry : headers.entrySet()) {
                    String key = entry.getKey();
                    if (key == null) continue;
                    if (key.equalsIgnoreCase("X-Requested-With")) continue;
                    if (key.equalsIgnoreCase("User-Agent")) continue;
                    if (key.equalsIgnoreCase("Accept-Encoding")) continue;
                    if (key.equalsIgnoreCase("Host")) continue;
                    conn.setRequestProperty(key, entry.getValue());
                }
            }
            String cookie = CookieManager.getInstance().getCookie(url);
            if (cookie != null && !cookie.isEmpty()) {
                conn.setRequestProperty("Cookie", cookie);
            }
            conn.connect();

            int status = conn.getResponseCode();
            Map<String, List<String>> headerFields = conn.getHeaderFields();
            if (headerFields != null) {
                List<String> setCookies = headerFields.get("Set-Cookie");
                if (setCookies == null) setCookies = headerFields.get("set-cookie");
                if (setCookies != null) {
                    for (String setCookie : setCookies) {
                        if (setCookie != null) {
                            CookieManager.getInstance().setCookie(url, setCookie);
                        }
                    }
                    CookieManager.getInstance().flush();
                }
            }

            Map<String, String> responseHeaders = new HashMap<>();
            if (headerFields != null) {
                for (Map.Entry<String, List<String>> entry : headerFields.entrySet()) {
                    String key = entry.getKey();
                    if (key == null) continue;
                    if (key.equalsIgnoreCase("Content-Encoding")) continue;
                    if (key.equalsIgnoreCase("Content-Length")) continue;
                    List<String> values = entry.getValue();
                    if (values == null || values.isEmpty() || values.get(0) == null) continue;
                    responseHeaders.put(key, values.get(0));
                }
            }

            String contentType = conn.getContentType();
            String mime = "text/html";
            String encoding = "utf-8";
            if (contentType != null) {
                String[] parts = contentType.split(";");
                if (parts.length > 0 && !parts[0].trim().isEmpty()) {
                    mime = parts[0].trim();
                }
                for (int i = 1; i < parts.length; i++) {
                    String part = parts[i].trim();
                    if (part.toLowerCase().startsWith("charset=")) {
                        encoding = part.substring("charset=".length()).trim().replace("\\"", "");
                    }
                }
            }

            InputStream stream;
            try {
                stream = status >= 400 ? conn.getErrorStream() : conn.getInputStream();
            } catch (Exception streamError) {
                stream = conn.getErrorStream();
            }
            if (stream == null) {
                stream = new ByteArrayInputStream(new byte[0]);
            }

            String reason = conn.getResponseMessage();
            if (reason == null || reason.isEmpty()) reason = "OK";
            WebResourceResponse response = new WebResourceResponse(mime, encoding, stream);
            response.setStatusCodeAndReasonPhrase(status, reason);
            response.setResponseHeaders(responseHeaders);
            return response;
        } catch (Exception ignored) {
            if (conn != null) {
                try {
                    conn.disconnect();
                } catch (Exception ignoredDisconnect) {}
            }
            return null;
        }
    }

    private void deliverOAuthUrlToMainWebView(String callbackUrl) {
        if (oauthResultDelivered) return;
        if (!isOAuthCallback(callbackUrl)) return;
        oauthResultDelivered = true;
        closeOAuthDialogCleanly();
        if (getBridge() != null && getBridge().getWebView() != null) {
            String js = "if(window.__kineticHandleNativeOAuthRedirect){window.__kineticHandleNativeOAuthRedirect("
                + JSONObject.quote(callbackUrl) + ");}";
            getBridge().getWebView().evaluateJavascript(js, null);
        }
        hideSystemBarsImmersive();
    }

    private void cancelOAuthFlow() {
        if (oauthResultDelivered) return;
        oauthResultDelivered = true;
        closeOAuthDialogCleanly();
        if (getBridge() != null && getBridge().getWebView() != null) {
            String js = "if(window.__kineticHandleNativeOAuthCancel){window.__kineticHandleNativeOAuthCancel('Login com Google cancelado.');}";
            getBridge().getWebView().evaluateJavascript(js, null);
        }
        hideSystemBarsImmersive();
    }

    private void closeOAuthDialogCleanly() {
        if (oauthWebView != null) {
            try {
                oauthWebView.stopLoading();
                oauthWebView.loadUrl("about:blank");
                oauthWebView.destroy();
            } catch (Exception ignored) {}
            oauthWebView = null;
        }
        if (oauthDialog != null) {
            try {
                if (oauthDialog.isShowing()) {
                    oauthDialog.dismiss();
                }
            } catch (Exception ignored) {}
            oauthDialog = null;
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        hideSystemBarsImmersive();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemBarsImmersive();
        }
    }

    private void hideSystemBarsImmersive() {
        Window window = getWindow();
        if (window == null) return;
        View decorView = window.getDecorView();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
        if (controller != null) {
            controller.hide(WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.navigationBars());
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
        }
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
        );
    }
}
`;

  fs.writeFileSync(mainActivityPath, immersiveMainActivity, 'utf8');
  console.log(`[patch-manifest] Patched ${mainActivityPath} with Sticky Immersive + In-App Native Google OAuth`);
}
