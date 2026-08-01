/**
 * Config plugin for the Mizan home-screen widget and Dynamic Island Live
 * Activity.
 *
 * What it does at prebuild time:
 *   1. Adds the App Group entitlement to the app target, so the app and the
 *      widget extension can share one UserDefaults suite.
 *   2. Enables Live Activities (NSSupportsLiveActivities) in Info.plist.
 *   3. Copies the Swift sources in ./targets/MizanWidgets into the iOS project
 *      directory so Xcode can pick them up as a Widget Extension target.
 *
 * What it deliberately does NOT do: create the Xcode extension target itself.
 * Adding a second target to the pbxproj reliably is what `@bacons/apple-targets`
 * or a manual Xcode step is for — see WIDGETS.md for the one-time setup.
 */

const fs = require('fs');
const path = require('path');
const {
  withEntitlementsPlist,
  withInfoPlist,
  withDangerousMod,
} = require('expo/config-plugins');

const APP_GROUP = 'group.pro.navai.mizan';

function withAppGroup(config) {
  return withEntitlementsPlist(config, (mod) => {
    const existing = mod.modResults['com.apple.security.application-groups'] ?? [];
    if (!existing.includes(APP_GROUP)) {
      mod.modResults['com.apple.security.application-groups'] = [...existing, APP_GROUP];
    }
    return mod;
  });
}

function withLiveActivities(config) {
  return withInfoPlist(config, (mod) => {
    mod.modResults.NSSupportsLiveActivities = true;
    mod.modResults.NSSupportsLiveActivitiesFrequentUpdates = true;
    return mod;
  });
}

function withWidgetSources(config) {
  return withDangerousMod(config, [
    'ios',
    (mod) => {
      const source = path.join(mod.modRequest.projectRoot, 'targets', 'MizanWidgets');
      const destination = path.join(mod.modRequest.platformProjectRoot, 'MizanWidgets');
      if (fs.existsSync(source)) {
        fs.mkdirSync(destination, { recursive: true });
        for (const file of fs.readdirSync(source)) {
          fs.copyFileSync(path.join(source, file), path.join(destination, file));
        }
      }
      return mod;
    },
  ]);
}

module.exports = function withMizanWidgets(config) {
  return withWidgetSources(withLiveActivities(withAppGroup(config)));
};

module.exports.APP_GROUP = APP_GROUP;
