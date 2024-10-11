import { merge } from 'rxjs';

import {
    cdbUpstreamMonitor$,
    channelPartnersUpstreamMonitor$,
    cloudPortalUpstreamMonitor$,
    hostUpstreamMonitor$,
} from './cloud_portal_services';
import {
    mapUpstreamStatus,
    statusChangedFactory,
    summarizeUpstreamMonitors,
    upstreamMonitorFactory,
} from './utils';

/**
 * Example for using upstreamMonitorFactory for a specific mediaserver or any other resource.
 *
 * This can be used anywhere and doesn't have to be defined ahead of time.
 */
export const demoSystemUpstreamMonitor$ = upstreamMonitorFactory(
    'https://322ed674-4f26-4a8d-b43b-cc4547874e7f.relay.vmsproxy.com/api/ping',
    'demoSystem',
    'GET',
);

/**
 * Example of combining commonly used streams into a single stream for easy reuse.
 */
export const allUpstreamMonitors$ = merge(
    hostUpstreamMonitor$,
    cdbUpstreamMonitor$,
    cloudPortalUpstreamMonitor$,
    demoSystemUpstreamMonitor$,
    channelPartnersUpstreamMonitor$,
    demoSystemUpstreamMonitor$,
);

/**
 * Example of creating a summarized object from multiple upstream monitors.
 */
export const summarizedMonitors$ = summarizeUpstreamMonitors(allUpstreamMonitors$);

/**
 * Example for a stream of all status changes for all upstream monitors.
 *
 * Useful for toasts and other ephemeral notifications.
 */
export const statusStream$ = mapUpstreamStatus(allUpstreamMonitors$);

/**
 * Example of initializing commonly used status change handlers.
 *
 * All these examples can be considered singletons since they're initialized only once.
 *
 * They're a lot easier to use than injecting services that might be dependent on several other services.
 *
 * The observables are all cold and are at rest until subscribed to.
 */
export const hostStatusChanged = statusChangedFactory(hostUpstreamMonitor$);

export const channelPartnersStatusChanged = statusChangedFactory(channelPartnersUpstreamMonitor$);
