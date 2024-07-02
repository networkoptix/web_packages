// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { MediaServerPeerConnection } from "../media-server-peer-connection";
import { RTCStatReportTypes, CandidatePairReport, InboundRtpReport } from "../types";
import { BaseConnectionTracker } from "./base-connection-tracker";
import { BaseTracker } from "./base-tracker";
import { WebRTCIssueDetectorWithState } from "./webrtc-issue-detector";

type CombinedReport = Omit<CandidatePairReport, 'type'> & Omit<InboundRtpReport, 'type'>;

const toMs = (seconds: number) => seconds * 1000;

/**
 * Track connection health for use in tuning webRTC streams.
 *
 * Uses a generic Mean Opinion Score (MOS) algorithm to calculate a score from 1-5.
 *
 * Could potentially be used as a base class if a more customized algorithm is needed.
 */
export class MosScoreTracker extends BaseTracker<number> {
    metricName = 'mosScore';
    currentValue = 5;

    weight = 5;
    priorityWeight = 0;

    /**
     * Use default metric handler.
     *
     * @param reset boolean
     * @returns number
     */
    getMetric(reset = false): number {
        return this.defaultMetricHandler(reset)
    };

    /**
     * Override the updateMetric method to use calculateFocusScore.
     *
     * @param now number
     * @returns number
     */
    override updateMetric(time: number): number {
        this.updateWindow(time)
        this.metricValues.push({ time, value: this.currentValue });
        return this.getMetric();
    };

    public updateConnection(connection: MediaServerPeerConnection) {
        this.destroy?.();
        this.connection = connection;
        this.destroy = WebRTCIssueDetectorWithState.track(this.connection, mos => {
            if (mos) {
                this.currentValue = mos;
            }
        }, issues => {
            this.logger?.info({ issues });
            if (issues.some(({ type }) => type !== 'cpu')) {
                connection.reconnectionHandler(true);
            }
        })
        this.updateMetric(performance.now());
    }
}
