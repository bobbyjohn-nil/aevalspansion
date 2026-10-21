# Permissions, purpose strings, and the privacy manifest

## The rule

A permission request without a purpose string is an App Store rejection. A permission granted without a
working denied path is a crash waiting for the first user who taps Don't Allow.

## iOS

Usage-description strings go in `ios.infoPlist` in the app config, for example `NSCameraUsageDescription`,
`NSLocationWhenInUseUsageDescription`, `NSPhotoLibraryUsageDescription`.

**Info.plist changes are not OTA-updatable.** Adding or changing a purpose string requires a new binary and a
new review. Plan permission work into a build, never into a hotfix.

Write the string as the specific reason, in the user's terms. "Access your camera" is not a reason. "Take a
photo of a receipt to attach to an expense" is.

## Android

Declare in `android.permissions`, and use `android.blockedPermissions` to strip permissions a library pulls in
that the app does not actually use. Google may reject an app that requests dangerous or signature permissions
without a justified in-app use, and every unnecessary permission in the manifest is a review risk with no
upside.

## Testing the denied path

Both platforms suppress repeat permission prompts after a denial. To test the denied flow again, uninstall and
reinstall the app. This is why "it worked when I tested it" is not evidence for the permission path: the
tester usually granted it once and never saw the branch again.

Every permission needs three designed states, not one:

1. Not yet asked. The feature is visible and explains what it needs before the system dialog appears.
2. Granted. Feature works.
3. Denied. The feature degrades to something usable, and the copy tells the user what to change and where,
   not "Permission denied".

## Apple privacy manifest (`PrivacyInfo.xcprivacy`)

Required when a native library touches a "required reason" API: UserDefaults, file timestamps, disk space,
system boot time, and others. Expo SDK packages that need one already ship it inside `node_modules`, but
third-party and bare native libraries often do not, and that gap is a live rejection vector.

For Expo Continuous Native Generation, declare it in `app.json`:

```json
{
  "ios": {
    "privacyManifests": {
      "NSPrivacyAccessedAPITypes": [
        { "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults",
          "NSPrivacyAccessedAPITypeReasons": ["CA92.1"] }
      ]
    }
  }
}
```

Reason codes are API-category specific. Use the code that matches the actual use, and do not copy a code from
another project's manifest because it made the warning go away.

## Checklist before a build that changes permissions

- [ ] Every requested permission has a purpose string that names the specific user-facing reason.
- [ ] Every permission the app requests is actually used by shipped code.
- [ ] `android.blockedPermissions` strips anything a dependency added that the app does not use.
- [ ] The denied path was tested on a fresh install, not on a device that already granted it.
- [ ] Any third-party native library added this change was checked for a bundled `PrivacyInfo.xcprivacy`.
- [ ] The change is going out as a binary build, not an OTA update.
