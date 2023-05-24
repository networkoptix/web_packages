// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { InboundRtpReport, StreamQuality } from "../types";
import { BaseConnectionTracker } from "./base-connection-tracker";

/**
 * Track FPS for use in tuning webRTC streams
 */
export class FrameTracker extends BaseConnectionTracker {
    override metricName = 'fps';
    weight = 1;
    priorityWeight = 0;

    override processInboundReport(report: InboundRtpReport): number {
        return report?.framesPerSecond ?? 0;
    }

    suggestedStream() {
        return this.getMetric() > 20 ? StreamQuality.high : StreamQuality.low;
    }
}
