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
// 3. Patch MainActivity.java (Sticky Immersive Mode hiding Android Nav & Status Bars)
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

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
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
  console.log(`[patch-manifest] Patched ${mainActivityPath} with Sticky Immersive Fullscreen`);
}
