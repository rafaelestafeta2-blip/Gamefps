import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');

if (!fs.existsSync(manifestPath)) {
  console.log(`[patch-manifest] Manifest file not found at ${manifestPath}, skipping.`);
  process.exit(0);
}

let content = fs.readFileSync(manifestPath, 'utf8');

// 1. Ensure VIBRATE permission exists
if (!content.includes('android.permission.VIBRATE')) {
  content = content.replace(
    '</manifest>',
    '    <uses-permission android:name="android.permission.VIBRATE" />\n</manifest>'
  );
}

// 2. Set activity screenOrientation to sensorLandscape cleanly
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

// 3. Ensure hardwareAccelerated="true"
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
console.log('[patch-manifest] Successfully patched AndroidManifest.xml (Landscape + Haptics VIBRATE)');
