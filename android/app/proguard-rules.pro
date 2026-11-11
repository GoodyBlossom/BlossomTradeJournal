# Keep JavaScript interface and WebView classes if needed
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
