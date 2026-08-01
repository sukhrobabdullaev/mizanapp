import SwiftUI
import WidgetKit

/// Payload the app writes into the shared App Group before each refresh.
struct MizanSnapshot: Codable {
    let nextPrayerName: String
    let nextPrayerAt: Date
    let tasksDone: Int
    let tasksTotal: Int
    let prayersKept: Int
    let streak: Int

    static let placeholder = MizanSnapshot(
        nextPrayerName: "Asr",
        nextPrayerAt: Date().addingTimeInterval(60 * 84),
        tasksDone: 7,
        tasksTotal: 10,
        prayersKept: 3,
        streak: 12
    )
}

enum MizanStore {
    static let appGroup = "group.pro.navai.mizan"
    static let key = "mizan.snapshot"

    /// Reads the snapshot the React Native side wrote; falls back to placeholder
    /// data so the widget gallery preview is never empty.
    static func read() -> MizanSnapshot {
        guard
            let defaults = UserDefaults(suiteName: appGroup),
            let raw = defaults.string(forKey: key),
            let data = raw.data(using: .utf8)
        else { return .placeholder }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return (try? decoder.decode(MizanSnapshot.self, from: data)) ?? .placeholder
    }
}

struct MizanEntry: TimelineEntry {
    let date: Date
    let snapshot: MizanSnapshot
}

struct MizanProvider: TimelineProvider {
    func placeholder(in context: Context) -> MizanEntry {
        MizanEntry(date: Date(), snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (MizanEntry) -> Void) {
        completion(MizanEntry(date: Date(), snapshot: MizanStore.read()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MizanEntry>) -> Void) {
        let snapshot = MizanStore.read()
        let now = Date()
        // Refresh every 15 minutes, or right at the next prayer if that is sooner.
        let next = min(now.addingTimeInterval(15 * 60), snapshot.nextPrayerAt)
        completion(Timeline(entries: [MizanEntry(date: now, snapshot: snapshot)],
                            policy: .after(max(next, now.addingTimeInterval(60)))))
    }
}

struct MizanWidgetView: View {
    var entry: MizanEntry

    private var progress: Double {
        entry.snapshot.tasksTotal == 0
            ? 0
            : Double(entry.snapshot.tasksDone) / Double(entry.snapshot.tasksTotal)
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(entry.snapshot.nextPrayerName.uppercased())
                .font(.caption2.weight(.bold))
                .foregroundStyle(.secondary)

            Text(entry.snapshot.nextPrayerAt, style: .timer)
                .font(.title2.weight(.heavy))
                .monospacedDigit()

            ProgressView(value: progress)
                .tint(Color(red: 0.06, green: 0.64, blue: 0.42))

            HStack(spacing: 6) {
                Text("\(entry.snapshot.tasksDone)/\(entry.snapshot.tasksTotal)")
                    .font(.caption.weight(.semibold))
                Text("· \(entry.snapshot.prayersKept)/5")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Text("🔥\(entry.snapshot.streak)")
                    .font(.caption.weight(.semibold))
            }
        }
        .padding()
    }

    // `containerBackground` is iOS 17+, and widgets there refuse to render
    // without it. On 16.x fall back to a plain background.
    @ViewBuilder
    var body: some View {
        if #available(iOS 17.0, *) {
            content.containerBackground(for: .widget) { Color(.systemBackground) }
        } else {
            content.background(Color(.systemBackground))
        }
    }
}

@main
struct MizanWidgetBundle: WidgetBundle {
    var body: some Widget {
        MizanWidget()
        if #available(iOS 16.1, *) {
            PrayerLiveActivity()
        }
    }
}

struct MizanWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "MizanWidget", provider: MizanProvider()) { entry in
            MizanWidgetView(entry: entry)
        }
        .configurationDisplayName("Mizan")
        .description("Keyingi namoz va bugungi progress.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
