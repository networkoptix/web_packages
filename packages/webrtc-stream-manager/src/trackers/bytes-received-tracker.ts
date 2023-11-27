// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { InboundRtpReport } from "../types";
import { BaseConnectionTracker } from "./base-connection-tracker";

/**
 * Track FPS for use in tuning webRTC streams
 */
export class BytesReceivedTracker extends BaseConnectionTracker {
    override metricName = 'bytesReceived';
    weight = 1;
    priorityWeight = 0;

    override processInboundReport(report: InboundRtpReport): number {
        return report?.bytesReceived ?? 0;
    }

    protected getAverage() {
        const bytes = this.metricValues.slice(Math.max(this.metricValues.length - 5, 0))
            .map(({ value }, index) => index ? value - this.metricValues[index - 1].value : value)
        return bytes.length < 3 ? 1 : bytes.reduce((acc, cur) => acc + cur, 0) / bytes.length;
    }
}
