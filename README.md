# Task Flow Lite ⚡

A modern, colorful, and lightweight personal task manager web application packaged as a compact native Android WebView APK. Built with pure HTML, CSS, and JavaScript. 100% offline-first with zero external dependencies and zero backend requirements.

---

## 📱 What the App Does

- **Add Tasks**: Quickly record tasks with custom categories (📌 General, 💼 Work, 🏠 Personal, ⚡ Urgent) and priorities (🔴 High, 🟡 Medium, 🟢 Normal).
- **Mark Complete**: Interactive checkboxes with instant strike-through animations and completion states.
- **Delete & Clear**: Remove single tasks with the 🗑️ button or batch-clear all completed tasks with the 🧹 **Clear Done** button.
- **Filter Views**: Switch smoothly between **All**, **Active**, and **Completed** tasks with live counter badges.
- **Visual Progress Bar**: Tracks and calculates your daily productivity percentage in real-time.
- **Local Persistence**: Saves all your data instantly using the browser's `localStorage` API (`taskflowlite_tasks`), keeping your data safe and private on your device.
- **100% Offline & Private**: Zero internet connection needed; runs completely locally.

---

## 💻 How to Run the Web App Locally

You can run Task Flow Lite directly in any browser:

### Option 1: Direct File Opening
Simply double-click `index.html` or open it with your browser:
```bash
start index.html
```

### Option 2: Using a Local Web Server (Node.js or Python)
If you have Node.js or Python installed:

**With Node.js:**
```bash
npx serve .
# or
node -e "const http=require('http'),fs=require('fs');http.createServer((req,res)=>fs.createReadStream(req.url==='/'?'index.html':req.url.slice(1)).pipe(res)).listen(8080,()=>console.log('Running on http://localhost:8080'));"
```

**With Python:**
```bash
python -m http.server 8080
```
Then visit `http://localhost:8080` in your browser.

---

## 🛠️ How to Build the APK

The project contains a complete native Android wrapper (`android/`) configured with a WebView pointing directly to `file:///android_asset/www/index.html`.

### Prerequisites:
- JDK 17
- Android SDK (compileSdk 34)

### Steps to Build Locally:
1. Navigate to the `android/` directory:
   ```bash
   cd android
   ```
2. Build the release APK using Gradle:
   * **On Windows:**
     ```cmd
     gradlew.bat assembleRelease
     ```
   * **On Linux / macOS:**
     ```bash
     chmod +x gradlew
     ./gradlew assembleRelease
     ```
3. The release APK will be output at:
   ```
   android/app/build/outputs/apk/release/taskflowlite-release.apk
   ```
4. Copy it to the project root:
   ```bash
   cp android/app/build/outputs/apk/release/*.apk ../taskflowlite.apk
   ```

---

## 📦 Where to Find the APK

1. **Project Root**: The compiled release APK is stored right at the root of the project as **`taskflowlite.apk`**.
2. **GitHub Releases**: Download the signed APK directly from the official [GitHub Releases](https://github.com/GoodyBlossom/taskflowlite/releases).

---

## ⚙️ Technical Specifications

| Property | Value |
|---|---|
| **App Name** | Task Flow Lite |
| **Package Name** | `com.taskflowlite.app` |
| **Tech Stack** | Vanilla HTML5, CSS3, ES6+ JavaScript |
| **Android Wrapper** | Native Android WebView |
| **Asset Location** | `android/app/src/main/assets/www` |
| **Offline Protocol** | `file:///android_asset/www/index.html` |
| **Min Android Version** | Android 5.0 Lollipop (API 21) |
| **Target Android Version**| Android 14 (API 34) |
| **Frameworks** | Pure Vanilla (No React, No Expo, No React Native) |

---

## 📄 License
MIT License. Created by [GoodyBlossom](https://github.com/GoodyBlossom).
