# Blossom Trade Journal 🌸

A discipline-focused trading journal and psychology tracking web application packaged as a compact native Android WebView APK. Built with pure HTML, CSS, and vanilla JavaScript. 100% offline-first with zero external dependencies and zero backend requirements.

---

## 📱 What the App Does

- **▦ Dashboard & KPIs**: Real-time daily tracking of trades, wins, losses, profit, loss, and net P/L. Features dynamic daily profit target and maximum loss limit progress bars with breach alerts, discipline scoring (/100), and a 30-day cumulative equity curve (SVG).
- **✎ Daily Journal**: Log trades by pair, side (Buy/Sell), outcome (Win/Loss/Breakeven), P/L amount, pips, strategy compliance, and setup notes. Includes emotional self-reflection checklists (FOMO, revenge trading, overtrading, fear) and custom rule evaluations.
- **☰ Trade History**: Search entries and filter by keyword, currency pair, date, outcome, or emotion tags. Includes full CSV export for trades and journal entries.
- **✔ Trading Rules**: Define and manage your personal "Things I MUST DO" and "Things I MUST NOT DO" rules to enforce discipline.
- **▤ Calendar**: Monthly calendar grid color-coding profitable days (green), losing days (red), and breakeven days (grey), with direct click-to-open journal access.
- **◔ Monthly Analytics**: Monthly win rate, total profit/loss, profitable vs. losing days, best/worst day, avg trade day, top emotions, and SVG equity/daily bar charts.
- **↗ Trading Growth**: Month-over-month trend analytics comparing emotional management, patience, strategy adherence, risk management, and consistency.
- **✐ Notes & Reflections**: Categorized repository for lessons, reminders, and strategy nuances.
- **🔒 100% Offline & Private**: Zero cloud backend dependencies; all records persist locally in your device's `localStorage` (`blossom_trade_journal_v2`).

---

## 💻 How to Run the Web App Locally

You can run Blossom Trade Journal directly in any web browser:

### Option 1: Direct File Opening
Double-click `index.html` or open it with your browser:
```bash
start index.html
```

### Option 2: Using Node.js or Python
If you have Node.js or Python installed:

**With Node.js:**
```bash
node server.js
```
Then visit `http://localhost:8080` in your browser.

**With Python:**
```bash
python -m http.server 8080
```

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
3. The release APK will be generated at:
   ```
   android/app/build/outputs/apk/release/blossomtradejournal-release.apk
   ```
4. Copy it to the project root:
   ```bash
   cp android/app/build/outputs/apk/release/*.apk ../blossomtradejournal.apk
   ```

---

## 📦 Where to Find the APK

1. **Project Root**: The compiled release APK is stored right at the root of the project as **`blossomtradejournal.apk`**.
2. **GitHub Releases**: Download the signed release APK directly from the official [GitHub Releases](https://github.com/GoodyBlossom/BlossomTradeJournal/releases).

---

## ⚙️ Technical Specifications

| Property | Value |
|---|---|
| **App Name** | Blossom Trade Journal |
| **Package Name** | `com.blossomtradejournal.app` |
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
