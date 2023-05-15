// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { StreamQuality, RTCStatReportTypes, CandidatePairReport, InboundRtpReport } from "../types";
import { BaseConnectionTracker } from "./base-connection-tracker";

type CombinedReport = Omit<CandidatePairReport, 'type'> & Omit<InboundRtpReport, 'type'>;

const toMs = (seconds: number) => seconds * 1000;

/**
 * Track connection health for use in tuning webRTC streams.
 *
 * Uses a generic Mean Opinion Score (MOS) algorithm to calculate a score from 1-5.
 *
 * Could potentially be used as a base class if a more customized algorithm is needed.
 */
export class MosScoreTracker extends BaseConnectionTracker<CombinedReport> {
    metricName = 'mosScore';

    weight = 5;
    priorityWeight = 0;

    /**
     * Filter used by BaseConnectionTracker to determine if a report should included in the report
     * used by processInboundReport.
     *
     * @param report
     * @returns boolean
     */
    public override isTargetReport(report: RTCStats): boolean {
        return [RTCStatReportTypes.candidatePair, RTCStatReportTypes.inboundRtp].includes(report.type as RTCStatReportTypes)
    };

    /**
     *  Calculates a MOS score from 1-5 based on the current connection stats using CandidatePairReport and InboundRtpReport.
     *
     * @param report - CandidatePairReport & InboundRtpReport
     * @returns - number
     */
    processInboundReport(report: CombinedReport): number {
        const averageLatency = Math.min(toMs(report?.currentRoundTripTime) || 100, 1000);
        const jitter = toMs(report?.jitter) || 10;
        const packetsLost = toMs(report?.packetsLost) || 0;
        const packetsReceived = toMs(report?.packetsReceived) || 0;
        const effectiveLatency = averageLatency + jitter * 2 + 10;
        const latencyDeduction = (latency: number) => latency < 160 ? latency / 40 : (latency - 120) / 10;
        const packetLossDeduction = (packetsLost: number, packetsReceived: number) => !packetsLost || !packetsReceived ? 0 : packetsLost / packetsReceived * 100 * 2.5;
        const rCurve = 93.2 - latencyDeduction(effectiveLatency) - packetLossDeduction(packetsLost, packetsReceived);
        const mos = 1 + (0.035 * rCurve) + (0.000007 * rCurve * (rCurve - 60) * (100 - rCurve));
        return mos
    }
}
