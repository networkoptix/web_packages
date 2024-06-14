// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import WebRTCIssueDetector, { IssueDetectorResult, NetworkScores } from 'webrtc-issue-detector';
import { MediaServerPeerConnection } from '../media-server-peer-connection';

export class WebRTCIssueDetectorWithState extends WebRTCIssueDetector {
    private constructor(updateCallback: (mos: number) => void, issuesCallback: (issues: IssueDetectorResult) => void) {
        super({
            autoAddPeerConnections: false,
            onIssues: (issues: IssueDetectorResult) => issuesCallback(issues),
            onNetworkScoresUpdated: ({ inbound }: NetworkScores) => updateCallback(inbound)
        });
    }

    public stopReporting = () => this.stopWatchingNewPeerConnections;

    static track = (pc: MediaServerPeerConnection, updateCallback: (mos: number) => void, issuesCallback: (issues: IssueDetectorResult) => void) => {
        const instance = new WebRTCIssueDetectorWithState(updateCallback, issuesCallback);
        instance.handleNewPeerConnection(pc);
        return instance.stopReporting;
    }
}

