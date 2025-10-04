/**
 * Performance logging utility for tracking startup and runtime performance
 */

const APP_START_TIME = performance.now();
const timestamps = new Map<string, number>();

interface TimingEntry {
    label: string;
    timestamp: number;
    elapsed: number;
    delta?: number;
}

export class PerfLogger {
    private static lastTimestamp = APP_START_TIME;
    private static entries: TimingEntry[] = [];

    static mark(label: string) {
        const now = performance.now();
        const elapsed = now - APP_START_TIME;
        const delta = now - this.lastTimestamp;

        const entry = {
            label,
            timestamp: now,
            elapsed,
            delta,
        };

        this.entries.push(entry);
        this.lastTimestamp = now;

        console.log(
            `⏱️ [PERF] ${label.padEnd(40)} | +${delta.toFixed(2)}ms | Total: ${elapsed.toFixed(2)}ms`
        );

        return entry;
    }

    static markStart(label: string) {
        timestamps.set(label, performance.now());
        console.log(`▶️ [PERF START] ${label}`);
    }

    static markEnd(label: string) {
        const start = timestamps.get(label);
        if (!start) {
            console.warn(`⚠️ [PERF] No start mark found for: ${label}`);
            return;
        }

        const duration = performance.now() - start;
        timestamps.delete(label);

        const elapsed = performance.now() - APP_START_TIME;
        console.log(
            `✅ [PERF END] ${label.padEnd(40)} | Duration: ${duration.toFixed(2)}ms | Total: ${elapsed.toFixed(2)}ms`
        );

        return duration;
    }

    static getEntries() {
        return this.entries;
    }

    static getSummary() {
        const total = this.lastTimestamp - APP_START_TIME;
        console.log("\n" + "=".repeat(80));
        console.log("📊 PERFORMANCE SUMMARY");
        console.log("=".repeat(80));

        this.entries.forEach((entry) => {
            const percentage = ((entry.delta || 0) / total) * 100;
            console.log(
                `${entry.label.padEnd(40)} | ${(entry.delta || 0).toFixed(2)}ms (${percentage.toFixed(1)}%)`
            );
        });

        console.log("=".repeat(80));
        console.log(`TOTAL STARTUP TIME: ${total.toFixed(2)}ms`);
        console.log("=".repeat(80) + "\n");

        return {
            total,
            entries: this.entries,
        };
    }

    static getDetailedSummary() {
        console.log("\n" + "=".repeat(80));
        console.log("📊 DETAILED PERFORMANCE BREAKDOWN");
        console.log("=".repeat(80));
        console.log(
            "Label".padEnd(45) +
            " | " +
            "Delta".padStart(10) +
            " | " +
            "Total".padStart(10) +
            " | " +
            "% of Total"
        );
        console.log("=".repeat(80));

        const total = this.lastTimestamp - APP_START_TIME;
        this.entries.forEach((entry) => {
            const percentage = ((entry.delta || 0) / total) * 100;
            console.log(
                `${entry.label.padEnd(45)} | ${(entry.delta || 0).toFixed(2).padStart(10)}ms | ${entry.elapsed.toFixed(2).padStart(10)}ms | ${percentage.toFixed(1).padStart(6)}%`
            );
        });

        console.log("=".repeat(80));
        console.log(`TOTAL: ${total.toFixed(2)}ms`);
        console.log("=".repeat(80) + "\n");

        return this.entries;
    }

    static getCurrentTime() {
        return performance.now() - APP_START_TIME;
    }

    static exportData() {
        return {
            appStartTime: APP_START_TIME,
            currentTime: performance.now(),
            totalElapsed: this.getCurrentTime(),
            entries: this.entries,
            activeTimestamps: Array.from(timestamps.entries()),
        };
    }

    static showTimeline() {
        const total = this.lastTimestamp - APP_START_TIME;
        const maxWidth = 60;

        console.log("\n" + "=".repeat(80));
        console.log("📈 PERFORMANCE TIMELINE");
        console.log("=".repeat(80));

        this.entries.forEach((entry, index) => {
            const barWidth = Math.max(1, Math.round((entry.elapsed / total) * maxWidth));
            const bar = "█".repeat(barWidth);
            const percentage = ((entry.elapsed / total) * 100).toFixed(1);

            console.log(`${index.toString().padStart(2)}. ${entry.label.slice(0, 35).padEnd(35)} ${bar} ${percentage}%`);
        });

        console.log("=".repeat(80));
        console.log(`Total: ${total.toFixed(2)}ms`);
        console.log("=".repeat(80) + "\n");
    }

    static reset() {
        this.entries = [];
        this.lastTimestamp = APP_START_TIME;
        timestamps.clear();
    }
}

// Auto-log app start
PerfLogger.mark("App script loaded");

// Export a global perf logger instance and helper functions
if (typeof window !== "undefined") {
    (window as any).__perfLogger = PerfLogger;

    // Add convenient global helpers
    (window as any).perfSummary = () => PerfLogger.getSummary();
    (window as any).perfDetails = () => PerfLogger.getDetailedSummary();
    (window as any).perfTimeline = () => PerfLogger.showTimeline();
    (window as any).perfExport = () => PerfLogger.exportData();
    (window as any).perfMark = (label: string) => PerfLogger.mark(label);

    console.log(
        "\n💡 Performance debugging helpers available:\n" +
        "  • perfSummary() - Show performance summary\n" +
        "  • perfDetails() - Show detailed breakdown\n" +
        "  • perfTimeline() - Show visual timeline\n" +
        "  • perfExport() - Export raw performance data\n" +
        "  • perfMark('label') - Add a custom performance mark\n"
    );
}

