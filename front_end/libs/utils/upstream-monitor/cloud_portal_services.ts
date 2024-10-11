import { upstreamMonitorFactory } from './utils';

/**
 * Upstream monitor for the host. Check if you're online.
 */
export const hostUpstreamMonitor$ = upstreamMonitorFactory('', 'host');

/**
 * Upstream monitor for the CDB. Check if cloud db is accessible.
 */
export const cdbUpstreamMonitor$ = upstreamMonitorFactory('/cdb/maintenance/health', 'cdb', 'GET');

/**
 * Upstream monitor for the cloud portal. Check if cloud portal backend is accessible.
 */
export const cloudPortalUpstreamMonitor$ = upstreamMonitorFactory(
    '/api/maintenance/health',
    'cloudPortal',
    'GET',
);

/**
 * Upstream monitor for the channel partners. Check if channel partners service is accessible.
 */
export const channelPartnersUpstreamMonitor$ = upstreamMonitorFactory(
    '/partners/utils/health_check',
    'channelPartners',
);
