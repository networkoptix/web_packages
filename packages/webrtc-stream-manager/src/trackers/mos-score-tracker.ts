// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { IssuePayload } from "webrtc-issue-detector";
import { MediaServerPeerConnection } from "../media-server-peer-connection";
import { CandidatePairReport, InboundRtpReport, ConnectionType } from "../types";
import { BaseTracker } from "./base-tracker";
import { WebRTCIssueDetectorWithState } from "./webrtc-issue-detector";

type CombinedReport = Omit<CandidatePairReport, 'type'> & Omit<InboundRtpReport, 'type'>;

const toMs = (seconds: number) => seconds * 1000;

/**
 * Severe issue threshold - only reconnect if MOS drops below this value.
 * MOS scale: 1 (bad) to 5 (excellent).
 * 2.0 indicates very poor quality that likely affects playback.
 */
const SEVERE_MOS_THRESHOLD = 2.0;

/**
 * Time in seconds that severe issues must persist before triggering reconnection.
 * Increased from 5s to 15s to be more conservative.
 */
const ISSUE_PERSISTENCE_THRESHOLD_SECONDS = 15;

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

    public override updateConnection(connection: MediaServerPeerConnection) {
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

                // Only consider SEVERE issues that could stop playback:
                // 1. MOS score is critically low (below threshold)
                // 2. Issues are not just CPU or candidate updates (informational)
                const hasSevereIssues = this.currentValue < SEVERE_MOS_THRESHOLD &&
                    issues.some(payload => payload.type !== 'cpu' && !isCandidateUpdate(payload));

                if (hasSevereIssues) {
                    connection.timeIssueOccurred ||= performance.now();
                } else {
                    // Clear the timer if issues resolved or MOS recovered
                    connection.timeIssueOccurred = undefined;
                }

                // Only trigger reconnection for SEVERE issues persisting for extended period
                if (connection.timeIssueOccurred &&
                    connection.timeIssueOccurred < performance.now() - toMs(ISSUE_PERSISTENCE_THRESHOLD_SECONDS)) {
                    // Reset timeIssueOccurred BEFORE triggering reconnection to prevent
                    // repeated reconnection attempts while issues persist
                    connection.timeIssueOccurred = undefined;
                    this.logger?.info(`Triggering reconnection due to severe MOS issues (MOS: ${this.currentValue})`);
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
