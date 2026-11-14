import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');
const stylesPath = path.resolve('android/app/src/main/res/values/styles.xml');
const javaSrcRoot = path.resolve('android/app/src/main/java');
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.resolve('firebase-applet-config.json'), 'utf8')
);
const authDomain = String(firebaseConfig.authDomain || '').trim();

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

  if (authDomain && !content.includes('kinetic-google-oauth')) {
    const oauthFilters = `
        <!-- kinetic-google-oauth -->
        <intent-filter>
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="https" android:host="${authDomain}" android:pathPrefix="/__/auth/handler" />
        </intent-filter>
        <intent-filter>
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="com.kineticlabs.tacticalfps" android:host="oauth" />
        </intent-filter>`;
    content = content.replace(
      /(<activity\b[^>]*android:name="[^"]*MainActivity"[^>]*>)/,
      `$1${oauthFilters}`
    );
  }

  content = content.replace(
    /(<activity\b[^>]*android:name="[^"]*MainActivity"[^>]*)>/,
    (_full, attrs) => {
      let next = attrs;
      if (/android:launchMode=/.test(next)) {
        next = next.replace(/android:launchMode="[^"]*"/, 'android:launchMode="singleTask"');
      } else {
        next += ' android:launchMode="singleTask"';
      }
      return `${next}>`;
    }
  );

  if (!content.includes('android:name="com.android.chrome"')) {
    content = content.replace(
      '</manifest>',
      `    <queries>
        <package android:name="com.android.chrome" />
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="https" />
        </intent>
    </queries>
</manifest>`
    );
  }

  fs.writeFileSync(manifestPath, content, 'utf8');
  console.log('[patch-manifest] Patched AndroidManifest.xml (Landscape + Haptics + GPU + Google OAuth)');
} else {
  console.log(`[patch-manifest] Manifest file not found at ${manifestPath}, skipping.`);
}

for (const gradleName of ['build.gradle', 'build.gradle.kts']) {
  const gradlePath = path.resolve('android/app', gradleName);
  if (!fs.existsSync(gradlePath)) continue;
  let gradle = fs.readFileSync(gradlePath, 'utf8');
  if (gradle.includes('androidx.browser:browser')) continue;
  const depLine = gradleName.endsWith('.kts')
    ? '    implementation("androidx.browser:browser:1.8.0")\n'
    : '    implementation "androidx.browser:browser:1.8.0"\n';
  if (!gradle.includes('dependencies')) continue;
  gradle = gradle.replace(/dependencies\s*\{/, (match) => `${match}\n${depLine}`);
  fs.writeFileSync(gradlePath, gradle, 'utf8');
  console.log(`[patch-manifest] Added Chrome Custom Tabs dependency to ${gradleName}`);
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
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final String OAUTH_PREFS = "kinetic_google_oauth";
    private static final String KEY_PENDING_URL = "pending_url";
    private static final String KEY_SESSION = "session_id";
    private static final String AUTH_HOST = "${authDomain}";

    private boolean oauthAwaitingBrowser = false;
    private boolean oauthResultDelivered = false;
    private boolean authBridgeAttached = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        String oauthUrl = extractOAuthUrl(getIntent());
        if (oauthUrl != null) {
            stashOAuthResult(oauthUrl);
            getIntent().setData(null);
        }
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        hideSystemBarsImmersive();
        attachAuthBridge();
        if (oauthUrl != null) {
            deliverOAuthUrlToJs(oauthUrl, 0);
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        String oauthUrl = extractOAuthUrl(intent);
        if (oauthUrl != null && intent != null) {
            intent.setData(null);
        }
        super.onNewIntent(intent);
        setIntent(intent);
        if (oauthUrl != null) {
            oauthAwaitingBrowser = false;
            oauthResultDelivered = true;
            stashOAuthResult(oauthUrl);
            deliverOAuthUrlToJs(oauthUrl, 0);
        }
    }

    private void attachAuthBridge() {
        if (authBridgeAttached || getBridge() == null || getBridge().getWebView() == null) return;
        getBridge().getWebView().addJavascriptInterface(new KineticNativeAuthBridge(), "KineticNativeAuth");
        authBridgeAttached = true;
    }

    public class KineticNativeAuthBridge {
        @JavascriptInterface
        public void startGoogleSignIn(final String oauthUrl) {
            runOnUiThread(() -> openGoogleInChrome(oauthUrl));
        }

        @JavascriptInterface
        public void rememberOAuthSession(final String sessionId) {
            prefs().edit().putString(KEY_SESSION, sessionId == null ? "" : sessionId).apply();
        }

        @JavascriptInterface
        public String readOAuthSession() {
            String value = prefs().getString(KEY_SESSION, "");
            return value == null ? "" : value;
        }

        @JavascriptInterface
        public String pollPendingOAuthResult() {
            String value = prefs().getString(KEY_PENDING_URL, "");
            return value == null ? "" : value;
        }

        @JavascriptInterface
        public void clearPendingOAuth() {
            prefs().edit().remove(KEY_PENDING_URL).apply();
        }
    }

    private SharedPreferences prefs() {
        return getSharedPreferences(OAUTH_PREFS, MODE_PRIVATE);
    }

    private void stashOAuthResult(String url) {
        prefs().edit().putString(KEY_PENDING_URL, url).apply();
    }

    private void openGoogleInChrome(String oauthUrl) {
        oauthAwaitingBrowser = true;
        oauthResultDelivered = false;
        Uri uri = Uri.parse(oauthUrl);
        String chrome = findChromePackage();
        Intent view = new Intent(Intent.ACTION_VIEW, uri);
        if (chrome != null) {
            view.setPackage(chrome);
        }
        try {
            startActivity(view);
            return;
        } catch (ActivityNotFoundException ignored) {
            view.setPackage(null);
        }
        try {
            CustomTabsIntent tabs = new CustomTabsIntent.Builder()
                .setShowTitle(true)
                .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
                .setUrlBarHidingEnabled(false)
                .build();
            tabs.launchUrl(this, uri);
        } catch (ActivityNotFoundException ignored) {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        }
    }

    private String findChromePackage() {
        String[] packages = new String[] {
            "com.android.chrome",
            "com.chrome.beta",
            "com.chrome.dev",
            "com.google.android.apps.chrome"
        };
        PackageManager pm = getPackageManager();
        for (String pkg : packages) {
            try {
                if (Build.VERSION.SDK_INT >= 33) {
                    pm.getPackageInfo(pkg, PackageManager.PackageInfoFlags.of(0));
                } else {
                    pm.getPackageInfo(pkg, 0);
                }
                return pkg;
            } catch (Exception ignored) {}
        }
        return null;
    }

    private String extractOAuthUrl(Intent intent) {
        if (intent == null || intent.getData() == null) return null;
        Uri data = intent.getData();
        String raw = intent.getDataString();
        if (raw == null) return null;
        String scheme = data.getScheme() == null ? "" : data.getScheme();
        boolean customScheme = "com.kineticlabs.tacticalfps".equals(scheme);
        boolean handler = raw.contains("/__/auth/handler")
            || (AUTH_HOST.length() > 0 && AUTH_HOST.equals(data.getHost()));
        if (!customScheme && !handler) return null;
        String fragment = data.getFragment();
        if (fragment != null && !fragment.isEmpty() && raw.indexOf('#') < 0) {
            raw = raw + "#" + fragment;
        }
        boolean hasToken = raw.contains("code=")
            || raw.contains("id_token=")
            || raw.contains("error=")
            || data.getQueryParameter("code") != null
            || data.getQueryParameter("error") != null
            || data.getQueryParameter("id_token") != null;
        return hasToken ? raw : null;
    }

    private void deliverOAuthUrlToJs(String callbackUrl, int attempt) {
        stashOAuthResult(callbackUrl);
        if (getBridge() != null && getBridge().getWebView() != null) {
            String js = "if(window.__kineticHandleNativeOAuthRedirect){window.__kineticHandleNativeOAuthRedirect("
                + JSONObject.quote(callbackUrl) + ");}";
            WebView webView = getBridge().getWebView();
            webView.post(() -> webView.evaluateJavascript(js, null));
            return;
        }
        if (attempt < 25) {
            new Handler(Looper.getMainLooper()).postDelayed(
                () -> deliverOAuthUrlToJs(callbackUrl, attempt + 1),
                400
            );
        }
    }

    private void notifyBrowserReturnedWithoutToken() {
        if (!oauthAwaitingBrowser || oauthResultDelivered) return;
        String pending = prefs().getString(KEY_PENDING_URL, "");
        if (pending != null && (pending.contains("code=") || pending.contains("id_token=") || pending.contains("error="))) {
            oauthResultDelivered = true;
            oauthAwaitingBrowser = false;
            deliverOAuthUrlToJs(pending, 0);
            return;
        }
        oauthAwaitingBrowser = false;
        if (getBridge() == null || getBridge().getWebView() == null) return;
        String js = "if(window.__kineticHandleNativeOAuthCancel){window.__kineticHandleNativeOAuthCancel('__PASTE__');}";
        getBridge().getWebView().evaluateJavascript(js, null);
    }

    @Override
    public void onResume() {
        super.onResume();
        hideSystemBarsImmersive();
        attachAuthBridge();
        if (oauthAwaitingBrowser) {
            new Handler(Looper.getMainLooper()).postDelayed(this::notifyBrowserReturnedWithoutToken, 700);
        }
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
  console.log(`[patch-manifest] Patched ${mainActivityPath} with Chrome Custom Tabs Google OAuth`);
}
