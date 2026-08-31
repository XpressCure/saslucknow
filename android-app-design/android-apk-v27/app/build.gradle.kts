plugins {
    id("com.android.application")
}

android {
    namespace = "in.saslucknow.preview"
    compileSdk = 37

    defaultConfig {
        applicationId = "in.saslucknow.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 30
        versionName = "darshan-menu-open-v30"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
}
