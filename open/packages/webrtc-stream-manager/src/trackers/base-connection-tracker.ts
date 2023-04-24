// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { InboundRtpReport, RTCStatReportTypes } from "../types";
import { BaseTracker } from "./base-tracker";


/**
 * Base class for all connection trackers with default handlers.
 *
 * This is for trackers the require data from the WebRTC peer connection.
 */
export abstract class BaseConnectionTracker<RTCReportType = InboundRtpReport> extends BaseTracker<number> {
    /**
     * Report filter to only include certain report types.
     *
     * Defaults to only include `inbound-rtp` reports.
     *
     * Override this method on derived classes to change the filter.
     *
     * @param report RTCStats
     * @returns boolean
     */
    public isTargetReport(report: RTCStats): boolean {
        return RTCStatReportTypes.inboundRtp === report.type
    };

    /**
     * Abstract method for processing the report.
     *
     * @param report RTCStats
     */
    public abstract processInboundReport(report?: RTCReportType): number;

    /**
     * Handler for processing the connection score.
     *
     * @returns
     */
    private getScoreFromConnection = async (): Promise<number> => {
        const track = this.connection?.getReceivers?.()?.[0]?.track
        if (!this.connection?.getStats || this.connection?.connectionState !== 'connected' || !track) {
            this.processInboundReport();
        }

        const stats = await this.connection?.getStats(track)
        let report: RTCReportType = {} as RTCReportType;
        (stats || []).forEach(current => {
            if (this.isTargetReport(current)) {
                Object.assign(report, current)
            }
        })

        return this.processInboundReport(report);
    }

    /**
     * Default get metric handler.
     *
     * @param reset boolean
     * @returns number
     */
    getMetric(reset = false): number {
        return this.defaultMetricHandler(reset)
    };

    /**
     * Updates accumulated metrics.
     *
     * @param now number
     * @returns number
     */
    updateMetric = (time: number): number => {
        this.updateWindow(time)
        this.getScoreFromConnection().then(value => this.metricValues.push({ time, value }))
        return this.getMetric();
    };
}
