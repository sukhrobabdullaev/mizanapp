import ActivityKit
import SwiftUI
import WidgetKit

/// Dynamic Island / Lock Screen countdown to the next prayer.
struct PrayerActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// Uzbek prayer label, e.g. "Asr".
        var prayerName: String
        /// When the prayer starts; rendered with SwiftUI's live timer style.
        var prayerAt: Date
    }

    /// Static for the life of the activity.
    var city: String
}

private let mizanGreen = Color(red: 0.06, green: 0.64, blue: 0.42)

@available(iOS 16.1, *)
struct PrayerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PrayerActivityAttributes.self) { context in
            // Lock Screen / banner presentation.
            HStack(spacing: 12) {
                Image(systemName: "moon.stars.fill")
                    .foregroundStyle(mizanGreen)
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.state.prayerName)
                        .font(.headline)
                    Text(context.attributes.city)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Text(context.state.prayerAt, style: .timer)
                    .font(.title3.weight(.bold))
                    .monospacedDigit()
                    .frame(maxWidth: 90, alignment: .trailing)
            }
            .padding()
            .activityBackgroundTint(Color(.systemBackground))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label(context.state.prayerName, systemImage: "moon.stars.fill")
                        .foregroundStyle(mizanGreen)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.prayerAt, style: .timer)
                        .monospacedDigit()
                        .frame(maxWidth: 80)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.attributes.city)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } compactLeading: {
                Image(systemName: "moon.stars.fill").foregroundStyle(mizanGreen)
            } compactTrailing: {
                Text(context.state.prayerAt, style: .timer)
                    .monospacedDigit()
                    .frame(maxWidth: 44)
            } minimal: {
                Image(systemName: "moon.stars.fill").foregroundStyle(mizanGreen)
            }
        }
    }
}
