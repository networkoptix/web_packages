// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { IssuePayload } from "webrtc-issue-detector";
import { MediaServerPeerConnection } from "../media-server-peer-connection";
import { CandidatePairReport, InboundRtpReport, ConnectionType } from "../types";
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
        this.pushMetricValue({ time, value: this.currentValue });
        return this.getMetric();
    };

    public updateConnection(connection: MediaServerPeerConnection) {
        this.destroy?.();
        this.connection = connection;
        this.destroy = WebRTCIssueDetectorWithState.track(
            this.connection,
            (mos) => {
                if (mos) {
                    this.currentValue = mos;
                }
            },
            (issues) => {
                this.logger?.info({ issues });
                const isCandidateUpdate = ({ type, statsSample }: IssuePayload) => type === 'network' && 'usingRelay' in statsSample;
                if (issues.some(payload => payload.type !== 'cpu' && !isCandidateUpdate(payload))) {
                    connection.timeIssueOccurred ||= performance.now();
                } else {
                    connection.timeIssueOccurred = undefined;
                }

                if (connection.timeIssueOccurred && connection.timeIssueOccurred < performance.now() - toMs(5)) {
                    connection.reconnectionHandler(false);
                }

                const candidateTypeUpdate = [...issues].reverse().find(isCandidateUpdate);
                if (candidateTypeUpdate?.statsSample) {
                    connection.updateConnectionType(candidateTypeUpdate.statsSample as unknown as ConnectionType);
                }
            }
        );
        this.updateMetric(performance.now());
    }
}
