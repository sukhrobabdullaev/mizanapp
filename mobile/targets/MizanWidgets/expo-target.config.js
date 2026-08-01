/** Widget Extension target, generated into the Xcode project by
 * `@bacons/apple-targets` during `expo prebuild`.
 *
 * The Swift sources next to this file are compiled into the target directly —
 * nothing is copied into `ios/` by hand any more.
 *
 * 16.1 is the floor because `PrayerLiveActivity` uses ActivityKit, which does
 * not exist before it. The App Group is inherited from the app target's
 * entitlements in app.json, so both sides always agree on the suite name.
 */
module.exports = {
  type: 'widget',
  name: 'MizanWidgets',
  deploymentTarget: '16.1',
  frameworks: ['WidgetKit', 'SwiftUI', 'ActivityKit'],
};
