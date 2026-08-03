package com.rythubiddamobile

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
      // Dev support OFF even in debug: this project ships the JS as an
      // embedded asset bundle (regenerated via `npx react-native bundle`)
      // instead of running Metro. Port 8081 on the dev machine belongs to
      // the rb-admin Spring Boot server, and the dev-support inspector
      // polling it crashes the app (okio "Unbalanced enter/exit" on the
      // OkHttp dispatcher). To use Metro again: start it on a free port
      // (e.g. `npx react-native start --port 8082`), `adb reverse
      // tcp:8082 tcp:8082`, and flip this back to ReactBuildConfig.DEBUG.
      useDevSupport = false,
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
