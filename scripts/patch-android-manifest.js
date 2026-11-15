import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');
const stylesPath = path.resolve('android/app/src/main/res/values/styles.xml');
const javaSrcRoot = path.resolve('android/app/src/main/java');

function findJavaFile(dir, fileName) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findJavaFile(fullPath, fileName);
      if (found) return found;
    } else if (entry.name === fileName) {
      return fullPath;
    }
  }
  return null;
}

function ensureActivityAttr(activityBlock, attrName, attrValue) {
  const re = new RegExp(`android:${attrName}="[^"]*"`);
  if (re.test(activityBlock)) {
    return activityBlock.replace(re, `android:${attrName}="${attrValue}"`);
  }
  return activityBlock.replace('<activity', `<activity\n            android:${attrName}="${attrValue}"`);
}

// ============================================================================
// 1. Patch AndroidManifest.xml
// ============================================================================
if (fs.existsSync(manifestPath)) {
  let content = fs.readFileSync(manifestPath, 'utf8');

  if (!content.includes('android.permission.VIBRATE')) {
    content = content.replace(
      '</manifest>',
      '    <uses-permission android:name="android.permission.VIBRATE" />\n</manifest>'
    );
  }
  if (!content.includes('android.permission.INTERNET')) {
    content = content.replace(
      '</manifest>',
      '    <uses-permission android:name="android.permission.INTERNET" />\n</manifest>'
    );
  }

  // Patch MAIN / LAUNCHER activity attributes for OAuth survival.
  content = content.replace(
    /<activity\b[\s\S]*?<\/activity>/g,
    (block) => {
      if (!block.includes('android.intent.action.MAIN')) return block;
      let next = block;
      next = ensureActivityAttr(next, 'screenOrientation', 'sensorLandscape');
      next = ensureActivityAttr(next, 'hardwareAccelerated', 'true');
      // singleTask: resume existing instance instead of cold-starting a second task.
      next = ensureActivityAttr(next, 'launchMode', 'singleTask');
      next = ensureActivityAttr(next, 'alwaysRetainTaskState', 'true');
      next = ensureActivityAttr(next, 'clearTaskOnLaunch', 'false');
      next = ensureActivityAttr(
        next,
        'configChanges',
        'orientation|keyboardHidden|screenSize|smallestScreenSize|screenLayout|uiMode|locale|layoutDirection'
      );
      return next;
    }
  );

  // Register dedicated Google OAuth activity (survives Account Picker overlay).
  if (!content.includes('android:name=".GoogleOAuthActivity"')) {
    const oauthActivity = `
        <activity
            android:name=".GoogleOAuthActivity"
            android:exported="false"
            android:launchMode="singleTop"
            android:screenOrientation="sensorLandscape"
            android:hardwareAccelerated="true"
            android:configChanges="orientation|keyboardHidden|screenSize|smallestScreenSize|screenLayout|uiMode"
            android:theme="@style/AppTheme.NoActionBar" />
`;
    if (content.includes('</application>')) {
      content = content.replace('</application>', `${oauthActivity}    </application>`);
    }
  }

  // Deep-link / custom-scheme return path (Custom Tabs / external browser fallback).
  if (!content.includes('android:scheme="com.kineticlabs.tacticalfps"')) {
    content = content.replace(
      /<activity\b[\s\S]*?<\/activity>/,
      (block) => {
        if (!block.includes('android.intent.action.MAIN')) return block;
        if (block.includes('android:scheme="com.kineticlabs.tacticalfps"')) return block;
        const filter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="com.kineticlabs.tacticalfps" android:host="auth" />
            </intent-filter>`;
        return block.replace('</activity>', `${filter}\n        </activity>`);
      }
    );
  }

  fs.writeFileSync(manifestPath, content, 'utf8');
  console.log(
    '[patch-manifest] Patched AndroidManifest.xml (singleTask + OAuth Activity + deep link)'
  );
} else {
  console.log(`[patch-manifest] Manifest file not found at ${manifestPath}, skipping.`);
}

// ============================================================================
// 2. Patch styles.xml
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
// 3. Patch / write MainActivity.java + GoogleOAuthActivity.java
// ============================================================================
const mainActivityPath = findJavaFile(javaSrcRoot, 'MainActivity.java');
if (mainActivityPath) {
  const rawJava = fs.readFileSync(mainActivityPath, 'utf8');
  const pkgMatch = rawJava.match(/package\s+([a-zA-Z0-9_.]+);/);
  const pkgName = pkgMatch ? pkgMatch[1] : 'com.kineticlabs.tacticalfps';
  const javaDir = path.dirname(mainActivityPath);

  const mainActivitySrc = `package ${pkgName};

import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Capacitor shell. Google OAuth runs in GoogleOAuthActivity (not a Dialog on this
 * Activity) so Account Picker / trust prompts do not destroy the in-app WebView
 * mid-flow. Pending tokens are persisted to SharedPreferences and flushed on resume.
 */
public class MainActivity extends BridgeActivity {
    public static final String PREFS = "kinetic_oauth_prefs";
    public static final String KEY_PENDING_URL = "pending_callback_url";
    public static final String KEY_PENDING_CANCEL = "pending_cancel";
    public static final String KEY_IN_PROGRESS = "oauth_in_progress";

    private ActivityResultLauncher<Intent> oauthLauncher;
    private boolean bridgeReady = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        oauthLauncher =
            registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    // Result also written to prefs inside GoogleOAuthActivity.
                    deliverPendingOAuthToJs(true);
                });

        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        hideSystemBarsImmersive();
        wireBridge();
        handleAuthDeepLink(getIntent());
        // Cold start after process death: flush any persisted OAuth result.
        getWindow().getDecorView().postDelayed(() -> deliverPendingOAuthToJs(true), 700);
    }

    @Override
    public void onResume() {
        super.onResume();
        hideSystemBarsImmersive();
        wireBridge();
        deliverPendingOAuthToJs(true);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleAuthDeepLink(intent);
        deliverPendingOAuthToJs(true);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemBarsImmersive();
            deliverPendingOAuthToJs(false);
        }
    }

    private void wireBridge() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        WebView mainWebView = getBridge().getWebView();
        WebSettings settings = mainWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setUserAgentString(buildCleanChromeUserAgent(settings.getUserAgentString()));
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(mainWebView, true);
        // Re-add interface every resume (safe; same name replaces).
        mainWebView.addJavascriptInterface(new KineticNativeAuthBridge(), "KineticNativeAuth");
        bridgeReady = true;
    }

    private String buildCleanChromeUserAgent(String rawUa) {
        if (rawUa == null || rawUa.isEmpty()) {
            return "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
        }
        String cleaned = rawUa.replace("; wv", "").replaceAll("Version/\\\\d+\\\\.\\\\d+\\\\s*", "");
        if (!cleaned.contains("Chrome/")) {
            return "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
        }
        return cleaned;
    }

    public class KineticNativeAuthBridge {
        @JavascriptInterface
        public void startGoogleSignIn(final String oauthUrl) {
            runOnUiThread(() -> {
                SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
                prefs.edit()
                    .putBoolean(KEY_IN_PROGRESS, true)
                    .remove(KEY_PENDING_URL)
                    .remove(KEY_PENDING_CANCEL)
                    .apply();
                Intent intent = new Intent(MainActivity.this, GoogleOAuthActivity.class);
                intent.putExtra(GoogleOAuthActivity.EXTRA_OAUTH_URL, oauthUrl);
                oauthLauncher.launch(intent);
            });
        }

        /** JS polls after resume / cold start if in-memory handlers were wiped. */
        @JavascriptInterface
        public String pollPendingOAuthResult() {
            SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
            String url = prefs.getString(KEY_PENDING_URL, "");
            boolean cancelled = prefs.getBoolean(KEY_PENDING_CANCEL, false);
            if (url != null && !url.isEmpty()) {
                prefs.edit().remove(KEY_PENDING_URL).putBoolean(KEY_IN_PROGRESS, false).apply();
                return url;
            }
            if (cancelled) {
                prefs.edit().remove(KEY_PENDING_CANCEL).putBoolean(KEY_IN_PROGRESS, false).apply();
                return "__CANCELLED__";
            }
            return "";
        }

        @JavascriptInterface
        public boolean isOAuthInProgress() {
            return getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(KEY_IN_PROGRESS, false);
        }

        @JavascriptInterface
        public void clearPendingOAuth() {
            getSharedPreferences(PREFS, MODE_PRIVATE)
                .edit()
                .remove(KEY_PENDING_URL)
                .remove(KEY_PENDING_CANCEL)
                .putBoolean(KEY_IN_PROGRESS, false)
                .apply();
        }
    }

    private void handleAuthDeepLink(Intent intent) {
        if (intent == null) return;
        Uri data = intent.getData();
        if (data == null) return;
        String raw = data.toString();
        if (raw.contains("auth") && (raw.contains("id_token") || raw.contains("access_token") || raw.contains("error="))) {
            getSharedPreferences(PREFS, MODE_PRIVATE)
                .edit()
                .putString(KEY_PENDING_URL, raw)
                .putBoolean(KEY_IN_PROGRESS, false)
                .apply();
        }
    }

    private void deliverPendingOAuthToJs(boolean force) {
        if (!bridgeReady && getBridge() == null) return;
        if (getBridge() == null || getBridge().getWebView() == null) return;
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String url = prefs.getString(KEY_PENDING_URL, "");
        boolean cancelled = prefs.getBoolean(KEY_PENDING_CANCEL, false);
        if ((url == null || url.isEmpty()) && !cancelled) {
            // Still in progress after process death — tell JS to keep waiting / reattach.
            if (force && prefs.getBoolean(KEY_IN_PROGRESS, false)) {
                String js =
                    "if(window.__kineticNotifyOAuthResume){window.__kineticNotifyOAuthResume();}";
                getBridge().getWebView().evaluateJavascript(js, null);
            }
            return;
        }
        if (url != null && !url.isEmpty()) {
            prefs.edit().remove(KEY_PENDING_URL).putBoolean(KEY_IN_PROGRESS, false).apply();
            String js =
                "if(window.__kineticHandleNativeOAuthRedirect){window.__kineticHandleNativeOAuthRedirect("
                    + org.json.JSONObject.quote(url)
                    + ");}else if(window.__kineticStashOAuthUrl){window.__kineticStashOAuthUrl("
                    + org.json.JSONObject.quote(url)
                    + ");}";
            getBridge().getWebView().evaluateJavascript(js, null);
            return;
        }
        if (cancelled) {
            prefs.edit().remove(KEY_PENDING_CANCEL).putBoolean(KEY_IN_PROGRESS, false).apply();
            String js =
                "if(window.__kineticHandleNativeOAuthCancel){window.__kineticHandleNativeOAuthCancel('Login com Google cancelado.');}";
            getBridge().getWebView().evaluateJavascript(js, null);
        }
    }

    private void hideSystemBarsImmersive() {
        Window window = getWindow();
        if (window == null) return;
        View decorView = window.getDecorView();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(window, decorView);
        if (controller != null) {
            controller.hide(
                WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.navigationBars());
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN);
    }
}
`;

  const oauthActivitySrc = `package ${pkgName};

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Dedicated OAuth Activity so Google Account Picker / trust confirmation does not
 * tear down the Capacitor/WebGL MainActivity mid-login. Result is persisted to
 * SharedPreferences before finish() so MainActivity can recover after process death.
 */
public class GoogleOAuthActivity extends Activity {
    public static final String EXTRA_OAUTH_URL = "oauth_url";

    private WebView oauthWebView;
    private boolean resultDelivered = false;
    private Bundle webViewState;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String oauthUrl = getIntent() != null ? getIntent().getStringExtra(EXTRA_OAUTH_URL) : null;
        if (oauthUrl == null || oauthUrl.isEmpty()) {
            finishWithCancel("URL OAuth ausente.");
            return;
        }

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
        LinearLayout.LayoutParams titleParams =
            new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        headerBar.addView(titleView, titleParams);

        Button closeBtn = new Button(this);
        closeBtn.setText("CANCELAR ✕");
        closeBtn.setTextColor(Color.WHITE);
        closeBtn.setTextSize(11f);
        closeBtn.setBackgroundColor(Color.parseColor("#1e293b"));
        closeBtn.setOnClickListener(v -> finishWithCancel("Login com Google cancelado."));
        headerBar.addView(closeBtn);

        rootLayout.addView(
            headerBar,
            new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        oauthWebView = new WebView(this);
        WebSettings ws = oauthWebView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setDatabaseEnabled(true);
        ws.setUserAgentString(buildCleanChromeUserAgent(ws.getUserAgentString()));
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(oauthWebView, true);
        oauthWebView.addJavascriptInterface(new PopupBridge(), "KineticPopupBridge");

        oauthWebView.setWebViewClient(
            new WebViewClient() {
                @Override
                public WebResourceResponse shouldInterceptRequest(
                    WebView view, WebResourceRequest request) {
                    // NEVER replace bare /__/auth/handler — fragment tokens (#id_token)
                    // are not in the network URL; swapping the page used to drop the
                    // hash and leave MainActivity stuck on CONECTANDO forever.
                    String reqUrl = request.getUrl().toString();
                    if (reqUrl.contains("/__/auth/handler")
                        && (reqUrl.contains("id_token=")
                            || reqUrl.contains("access_token=")
                            || reqUrl.contains("error="))) {
                        runOnUiThread(() -> finishWithSuccess(reqUrl));
                    }
                    return super.shouldInterceptRequest(view, request);
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    String url = request.getUrl().toString();
                    if (urlContainsOAuthResult(url)) {
                        finishWithSuccess(url);
                        return true;
                    }
                    // Allow https Account Picker / Google pages; block custom schemes except ours.
                    if (url.startsWith("https://") || url.startsWith("http://")) {
                        return false;
                    }
                    if (url.startsWith("com.kineticlabs.tacticalfps://")) {
                        finishWithSuccess(url);
                        return true;
                    }
                    return true;
                }

                @Override
                public void onPageStarted(WebView view, String url, Bitmap favicon) {
                    super.onPageStarted(view, url, favicon);
                    if (urlContainsOAuthResult(url)) {
                        finishWithSuccess(url);
                    }
                }

                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    // Implicit OAuth puts tokens in the URL hash — read location.href.
                    if (url != null && url.contains("/__/auth/handler")) {
                        view.evaluateJavascript(
                            "(function(){return window.location.href;})()",
                            val -> {
                                if (val == null) return;
                                String unquoted = val.replaceAll("^\\"|\\"$", "");
                                if (urlContainsOAuthResult(unquoted)) {
                                    finishWithSuccess(unquoted);
                                }
                            });
                    }
                }

                @Override
                public void onReceivedError(
                    WebView view, WebResourceRequest request, WebResourceError error) {
                    super.onReceivedError(view, request, error);
                    if (request != null && request.isForMainFrame()) {
                        finishWithCancel("Falha de rede no login Google. Tente de novo.");
                    }
                }
            });

        rootLayout.addView(
            oauthWebView,
            new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(rootLayout);

        // Hard abort so OAuth Activity cannot orphan MainActivity CONECTANDO.
        new android.os.Handler(android.os.Looper.getMainLooper())
            .postDelayed(
                () -> {
                    if (!resultDelivered) {
                        finishWithCancel("Login Google expirou na janela nativa (90s).");
                    }
                },
                90_000L);

        if (savedInstanceState != null) {
            oauthWebView.restoreState(savedInstanceState);
        } else {
            oauthWebView.loadUrl(oauthUrl);
        }
    }

    private static boolean urlContainsOAuthResult(String url) {
        if (url == null) return false;
        return url.contains("id_token=")
            || url.contains("access_token=")
            || url.contains("error=");
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (oauthWebView != null) {
            oauthWebView.saveState(outState);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        // Keep WebView alive across Account Picker; do not destroy here.
        if (oauthWebView != null) {
            webViewState = new Bundle();
            oauthWebView.saveState(webViewState);
        }
    }

    @Override
    public void onBackPressed() {
        if (oauthWebView != null && oauthWebView.canGoBack()) {
            oauthWebView.goBack();
            return;
        }
        finishWithCancel("Login com Google cancelado.");
    }

    private class PopupBridge {
        @JavascriptInterface
        public void onCallbackUrl(final String callbackUrl) {
            runOnUiThread(() -> finishWithSuccess(callbackUrl));
        }
    }

    private void finishWithSuccess(String callbackUrl) {
        if (resultDelivered) return;
        resultDelivered = true;
        SharedPreferences prefs = getSharedPreferences(MainActivity.PREFS, MODE_PRIVATE);
        prefs
            .edit()
            .putString(MainActivity.KEY_PENDING_URL, callbackUrl)
            .remove(MainActivity.KEY_PENDING_CANCEL)
            .putBoolean(MainActivity.KEY_IN_PROGRESS, false)
            .commit();
        setResult(RESULT_OK);
        destroyWebView();
        finish();
    }

    private void finishWithCancel(String reason) {
        if (resultDelivered) return;
        resultDelivered = true;
        SharedPreferences prefs = getSharedPreferences(MainActivity.PREFS, MODE_PRIVATE);
        prefs
            .edit()
            .remove(MainActivity.KEY_PENDING_URL)
            .putBoolean(MainActivity.KEY_PENDING_CANCEL, true)
            .putBoolean(MainActivity.KEY_IN_PROGRESS, false)
            .commit();
        setResult(RESULT_CANCELED);
        destroyWebView();
        finish();
    }

    private void destroyWebView() {
        if (oauthWebView != null) {
            try {
                oauthWebView.stopLoading();
                oauthWebView.loadUrl("about:blank");
                ((ViewGroup) oauthWebView.getParent()).removeView(oauthWebView);
                oauthWebView.destroy();
            } catch (Exception ignored) {
            }
            oauthWebView = null;
        }
    }

    private String buildCleanChromeUserAgent(String rawUa) {
        if (rawUa == null || rawUa.isEmpty()) {
            return "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
        }
        String cleaned = rawUa.replace("; wv", "").replaceAll("Version/\\\\d+\\\\.\\\\d+\\\\s*", "");
        if (!cleaned.contains("Chrome/")) {
            return "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
        }
        return cleaned;
    }
}
`;

  fs.writeFileSync(mainActivityPath, mainActivitySrc, 'utf8');
  fs.writeFileSync(path.join(javaDir, 'GoogleOAuthActivity.java'), oauthActivitySrc, 'utf8');
  console.log(
    `[patch-manifest] Wrote MainActivity + GoogleOAuthActivity under ${javaDir}`
  );
} else {
  console.log('[patch-manifest] MainActivity.java not found, skipping Java patch.');
}
