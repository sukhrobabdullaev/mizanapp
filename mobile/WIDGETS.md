# Widget & Live Activity setup

The Swift sources and the config plugin are in the repo, but a Widget Extension
is a **second Xcode target** — that part cannot be created from JS config alone
and has not been compiled in this environment (no Xcode installed).

## What is already wired

| Piece | File | Status |
|---|---|---|
| App Group entitlement + `NSSupportsLiveActivities` | `plugins/withMizanWidgets.js` | applied on `expo prebuild` |
| Swift sources copied into `ios/MizanWidgets/` | same plugin | applied on `expo prebuild` |
| Home-screen widget (small + medium) | `targets/MizanWidgets/MizanWidget.swift` | written, **not compiled** |
| Dynamic Island prayer countdown | `targets/MizanWidgets/PrayerLiveActivity.swift` | written, **not compiled** |
| JS bridge (no-ops without the native module) | `src/lib/widgets.ts` | typechecked |

## One-time setup on a Mac with Xcode

```bash
cd mobile
npx expo prebuild -p ios      # generates ios/, applies the plugin
open ios/Mizan.xcworkspace
```

Then, in Xcode:

1. **File → New → Target → Widget Extension**, name it `MizanWidgets`,
   tick *Include Live Activity*, uncheck *Include Configuration Intent*.
2. Delete the boilerplate files Xcode generates; add the two files already
   copied to `ios/MizanWidgets/` to the new target instead.
3. Select the `MizanWidgets` target → **Signing & Capabilities** → **+ App
   Groups** → tick `group.pro.navai.mizan` (the app target already has it via
   the plugin).
4. Set the extension's deployment target to **iOS 16.1** or later — Live
   Activities do not exist before that.

## Native module for the bridge

`src/lib/widgets.ts` expects a native module named `MizanWidgets` exposing
`setSnapshot(json)` and `reloadTimelines()`. Until that module ships, every call
is a no-op and the widget falls back to `MizanSnapshot.placeholder`. Implement it
as a small Expo module that writes to
`UserDefaults(suiteName: "group.pro.navai.mizan")` under key `mizan.snapshot`
and calls `WidgetCenter.shared.reloadAllTimelines()`.
