# ProGuard rules for Rythu Bidda.

# Keep annotations
-keepattributes *Annotation*

# Keep line numbers for stack traces
-keepattributes SourceFile,LineNumberTable

# --- Razorpay ---
-keep class com.razorpay.** { *; }
-dontwarn com.razorpay.**
-optimizations !method/inlining/
-keepclasseswithmembers class * {
  public void onPayment*(...);
}

# --- React Native Keychain ---
-keep class com.oblador.keychain.** { *; }

# --- OkHttp / Okio (used by axios-like libs indirectly) ---
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn org.conscrypt.**

# --- Hermes ---
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
