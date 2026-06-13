allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

subprojects {
    val configureProject = {
        if (plugins.hasPlugin("com.android.library") || plugins.hasPlugin("com.android.application")) {
            val android = extensions.findByName("android")
            if (android != null) {
                // 1. Force compileSdk to 34 to satisfy AndroidX dependencies
                try {
                    val compileSdkMethod = android.javaClass.methods.firstOrNull { 
                        it.name == "compileSdk" && it.parameterTypes.size == 1 && (it.parameterTypes[0] == Integer.TYPE || it.parameterTypes[0] == Integer::class.java)
                    }
                    if (compileSdkMethod != null) {
                        compileSdkMethod.invoke(android, 34)
                    } else {
                        val compileSdkVersionMethod = android.javaClass.methods.firstOrNull { 
                            it.name == "compileSdkVersion" && it.parameterTypes.size == 1 && (it.parameterTypes[0] == Integer.TYPE || it.parameterTypes[0] == Integer::class.java)
                        }
                        compileSdkVersionMethod?.invoke(android, 34)
                    }
                } catch (e: Exception) {
                    project.logger.warn("Could not set compileSdk on subproject ${project.name}: ${e.message}")
                }

                // 2. Clean Manifest and set Namespace dynamically
                try {
                    val manifestFile = project.file("src/main/AndroidManifest.xml")
                    var manifestPackage: String? = null
                    if (manifestFile.exists()) {
                        var content = manifestFile.readText()
                        val match = Regex("""package="([^"]+)"""").find(content)
                        if (match != null) {
                            manifestPackage = match.groupValues[1]
                            content = content.replace(Regex("""\s*package="[^"]*""""), "")
                            manifestFile.writeText(content)
                        }
                    }

                    val namespaceMethod = android.javaClass.methods.firstOrNull { it.name == "getNamespace" }
                    val currentNamespace = namespaceMethod?.invoke(android)
                    if (currentNamespace == null) {
                        val setNamespaceMethod = android.javaClass.methods.firstOrNull { 
                            it.name == "setNamespace" && it.parameterTypes.size == 1 && it.parameterTypes[0] == String::class.java 
                        }
                        val resolvedNamespace = manifestPackage ?: project.group.toString()
                        setNamespaceMethod?.invoke(android, resolvedNamespace)
                    }
                } catch (e: Exception) {
                    project.logger.warn("Could not handle namespace/manifest on subproject ${project.name}: ${e.message}")
                }
            }
        }
    }

    if (state.executed) {
        configureProject()
    } else {
        afterEvaluate {
            configureProject()
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
