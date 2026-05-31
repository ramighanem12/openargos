{
  "targets": [
    {
      "target_name": "macos_permissions",
      "sources": ["macos_permissions.mm"],
      "xcode_settings": {
        "OTHER_LDFLAGS": [
          "-framework",
          "AppKit",
          "-framework",
          "CoreGraphics",
          "-framework",
          "ApplicationServices",
          "-framework",
          "Carbon",
          "-framework",
          "AVFoundation",
          "-framework",
          "Vision"
        ]
      }
    }
  ]
}
