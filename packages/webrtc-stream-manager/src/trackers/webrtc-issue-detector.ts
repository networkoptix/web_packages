// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import WebRTCIssueDetector, { AvailableOutgoingBitrateIssueDetector, BaseIssueDetector, EventType, FramesDroppedIssueDetector, FramesEncodedSentIssueDetector, InboundNetworkIssueDetector, IssueDetector, IssueDetectorResult, IssueReason, IssueType, NetworkMediaSyncIssueDetector, NetworkScores, OutboundNetworkIssueDetector, QualityLimitationsIssueDetector, StatsParsingFinishedPayload, UnknownVideoDecoderImplementationDetector, WebRTCStatsParsed } from 'webrtc-issue-detector';
import { MediaServerPeerConnection } from '../media-server-peer-connection';

class RelayUsedDetector extends BaseIssueDetector{
    performDetection({ connection, ...other }: WebRTCStatsParsed): IssueDetectorResult {
        if (!connection.local || !connection.remote) {
            return [];
        }
        const { local: { candidateType: localCandidateType}, remote: { candidateType: remoteCandidateType } } = connection;
        const usingRelay = [remoteCandidateType, localCandidateType].includes('relay');
        return [{
            type: IssueType.Network,
            reason: IssueReason.InboundNetworkQuality,
            statsSample: { usingRelay, localCandidateType, remoteCandidateType }
        }];
    }
}

export class WebRTCIssueDetectorWithState extends WebRTCIssueDetector {
    private constructor(updateCallback: (mos: number) => void, issuesCallback: (issues: IssueDetectorResult) => void) {
        super({
            autoAddPeerConnections: false,
            onIssues: (issues: IssueDetectorResult) => issuesCallback(issues),
            onNetworkScoresUpdated: ({ inbound }: NetworkScores) => updateCallback(inbound),
            detectors: [
                new RelayUsedDetector(),
                new QualityLimitationsIssueDetector(),
                new FramesDroppedIssueDetector(),
                new FramesEncodedSentIssueDetector(),
                new InboundNetworkIssueDetector(),
                new OutboundNetworkIssueDetector(),
                new NetworkMediaSyncIssueDetector(),
                new AvailableOutgoingBitrateIssueDetector(),
                new UnknownVideoDecoderImplementationDetector(),
            ]
        });
    }

    public stopReporting = () => this.stopWatchingNewPeerConnections();

    static track = (pc: MediaServerPeerConnection, updateCallback: (mos: number) => void, issuesCallback: (issues: IssueDetectorResult) => void) => {
        const instance = new WebRTCIssueDetectorWithState(updateCallback, issuesCallback);
        instance.handleNewPeerConnection(pc);
        return instance.stopReporting;
    }
}

