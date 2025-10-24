// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { MediaServerPeerConnection } from '../media-server-peer-connection';
import { IntRange, StreamQuality, StreamQualityStrings } from '../types';
import { WebRTCIssueDetectorWithState } from './webrtc-issue-detector';

interface MetricWrapper<Metric> {
    time: number,
    value: Metric
}

/**
 * Base class for all trackers with default handlers.
 */
export abstract class BaseTracker<Metric> {
    protected videoElementRefs: HTMLVideoElement[] = [];
    protected start = Infinity;
    protected end = 0;
    protected metricValues: MetricWrapper<Metric>[] = [];
    protected checkPlayers = false;

    /**
     * Maximum number of metric values to store.
     * Calculated as (sampleSize / updateInterval) * 2 for safety margin.
     * Default: 10 entries (5 second window / 1 second updates * 2)
     *
     * Prevents unbounded memory growth while maintaining statistical accuracy.
     */
    protected maxMetricValues: number;

    public connection: MediaServerPeerConnection;

    public abstract weight: number;

    public abstract priorityWeight: number;

    public metricThreshold: IntRange<1, 6> = 3;

    public abstract getMetric(...args: unknown[]): unknown;

    public abstract updateMetric(now: number, ...args: unknown[]): unknown;

    public abstract metricName: string;

    public  destroy: () => void = () => {};

    get players() {
        return this.videoElementRefs.length
    }

    /**
     * Reset the tracker.
     */
    protected reset() {
        this.start = performance.now();
        this.end = this.start;
        this.metricValues = [];
    };

    /**
     * Check if there are any metric values to calculate from.
     *
     * @returns boolean
     */
    protected noMetricValues() {
        return !this.metricValues.length || this.start === this.end || this.checkPlayers && !this.players;
    }

    /**
     * Updates that start and end times for slicing metric values.
     * @param now number
     */
    protected updateWindow(now: number) {
        this.start = Math.min(this.start, now);
        this.end = Math.max(this.start, now);
    }

    /**
     * Update the player refs used by tracker.
     *
     * @param players HTMLVideoElement[]
     */
    public updatePlayers(players: HTMLVideoElement[]) {
        this.videoElementRefs = players;
    }

    private tracker: WebRTCIssueDetectorWithState

    /**
     * Update the connection ref used by tracker and updates intial metrics.
     *
     * @param connection - MediaServerPeerConnection
     */
    public updateConnection(connection: MediaServerPeerConnection) {
        this.connection = connection;
        this.updateMetric(performance.now());
    }

    /**
     * Metric mixin object for tracker.
     *
     * @returns - { metricName: Metric }
    */
    public toMetric() {
        return {
            [this.metricName]: this.getMetric()
        }
    }

    /**
     * Priority score for tracker.
     *
     * @returns number
     */
    public toPriority(): number {
        const metric = this.getMetric();
        if (typeof metric === 'number') {
            return metric * this.priorityWeight;
        }
        this.logger?.error('Metric type incompatible with default suggestedStream implementation. Please override in your derived class.')
        return 0;
    }


    /**
     * Suggested stream by tracker.
     *
     * @returns 'high' | 'low'
     */
    public toSuggestedStream() {
        return {
            [this.metricName]: this.suggestedStream()
        }
    }

    /**
     * Filter metric values to only include values within the sample size.
     */
    protected filterMetricValues() {
        this.metricValues = this.metricValues.filter((frame) => frame.time > this.end - this.sampleSize)
    }

    /**
     * Add a metric value with automatic bounds enforcement.
     * Maintains circular buffer behavior by removing oldest entries when limit is reached.
     *
     * @param value MetricWrapper to add
     */
    protected pushMetricValue(value: MetricWrapper<Metric>) {
        this.metricValues.push(value);

        // Enforce bounds: keep only the most recent maxMetricValues entries
        if (this.metricValues.length > this.maxMetricValues) {
            this.metricValues = this.metricValues.slice(-this.maxMetricValues);
        }
    }

    /**
     * Get approximate memory usage of metricValues array.
     * Useful for debugging and monitoring memory consumption.
     *
     * @returns Approximate memory usage in bytes
     */
    public getMetricMemoryUsage(): number {
        // Approximate: Each MetricWrapper has time (8 bytes) + value (varies) + object overhead (~24 bytes)
        const bytesPerEntry = 40; // Conservative estimate
        return this.metricValues.length * bytesPerEntry;
    }

    /**
     * Get metrics statistics for debugging.
     *
     * @returns Object with array length, max capacity, and memory usage
     */
    public getMetricStats() {
        return {
            currentEntries: this.metricValues.length,
            maxEntries: this.maxMetricValues,
            memoryUsageBytes: this.getMetricMemoryUsage(),
            memoryUsageKB: Math.round(this.getMetricMemoryUsage() / 1024 * 100) / 100,
            utilizationPercent: Math.round((this.metricValues.length / this.maxMetricValues) * 100)
        };
    }

    /**
     * Assert that metric values are of type number.
     *
     * @param metrics - unknown[]
     * @returns  metrics is MetricWrapper<number>[]
     */
    private metricIsNumber(metrics: unknown[]): metrics is MetricWrapper<number>[] {
        return !this.metricValues.length || typeof this.metricValues[0].value === 'number'
    }

    /**
     * Suggested stream by tracker.
     *
     * @returns 'high' | 'low'
     */
    public suggestedStream(): StreamQualityStrings {
        const metric = this.getMetric();
        if (typeof metric === 'number') {
            return metric > this.metricThreshold ? StreamQuality.high : StreamQuality.low;
        }
        this.logger?.error('Metric type incompatible with default suggestedStream implementation. Please override in your derived class.')
        return StreamQuality.low;
    }

    /**
     * Get average of collected metric values.
     *
     * @returns number
     */
    protected getAverage() {
        const metric: MetricWrapper<unknown>[] = this.metricValues;

        if (this.metricIsNumber(metric)) {
            const total = metric.reduce((total, { value }) => total + value, 0);
            return total ? total / this.metricValues.length : total
        }

        const seconds = (this.end - this.start) / 1000;
        return metric.length / seconds / this.players
    }

    /**
     * Default metric calculation if metric type is number.
     *
     * @param reset Whether to reset counters
     * @returns number
     */
    defaultMetricHandler(this: BaseTracker<number>, reset = false): number {
        if (this.noMetricValues()) {
            return 0;
        }

        this.filterMetricValues();
        const average = Math.round(this.getAverage() * 100) / 100;

        if (reset) {
            this.reset();
        }

        return average;
    };

    /**
     * Default metric updater if metric type is number.
     *
     * @param time - number
     * @returns - number
     */
    defaultUpdateMetricHandler(this: BaseTracker<number>, time: number): number {
        this.updateWindow(time)
        this.pushMetricValue({ time, value: time });
        return this.defaultMetricHandler();
    }

    constructor(
        public sampleSize = 5000,
        protected logger?: Console,
    ) {
        // Calculate max values: (sampleSize / 1000ms update interval) * 2 for safety
        // Default: (5000 / 1000) * 2 = 10 entries
        this.maxMetricValues = Math.max(10, Math.ceil((sampleSize / 1000) * 2));
    }
}
