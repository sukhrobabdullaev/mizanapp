/**
 * Config plugin for the Mizan home-screen widget and Dynamic Island Live
 * Activity.
 *
 * What it does at prebuild time:
 *   1. Enables Live Activities (NSSupportsLiveActivities) in Info.plist.
 *
 * Everything else is now owned by `@bacons/apple-targets`, which creates the
 * Widget Extension target from `targets/MizanWidgets/expo-target.config.js`
 * and compiles the Swift sources in place. The App Group lives in app.json
 * under `ios.entitlements` so the app and the extension read it from one
 * source; apple-targets syncs it onto the extension automatically.
 */

const { withInfoPlist } = require('expo/config-plugins');

function withLiveActivities(config) {
  return withInfoPlist(config, (mod) => {
    mod.modResults.NSSupportsLiveActivities = true;
    mod.modResults.NSSupportsLiveActivitiesFrequentUpdates = true;
    return mod;
  });
}

module.exports = function withMizanWidgets(config) {
  return withLiveActivities(config);
};
