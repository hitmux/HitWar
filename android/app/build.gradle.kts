plugins {
    id("com.android.application")
}

android {
    namespace = "com.hitmux.hitwar"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.hitmux.hitwar"
        minSdk = 23
        targetSdk = 35
        versionCode = 243
        versionName = "2.4.3"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = false
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
