import { RouterState } from './route-state.store';

export const generateRoute = ({
    partnerId,
    organizationId,
    groupId,
    subChannelId,
    tabId,
    email,
}: Partial<RouterState>): string => {
    const segments = ['/home'];

    if (partnerId) {
        segments.push('channelPartners', partnerId);
    }

    if (subChannelId) {
        segments.push('subChannel', subChannelId);
    }

    if (organizationId) {
        segments.push('organization', organizationId);
    }

    if (groupId) {
        segments.push('group', groupId);
    }

    if (tabId) {
        segments.push(tabId);
        if (tabId === 'users' && email) {
            segments.push(email);
        }
    }

    return [...segments].join('/');
};
