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
        segments.push('channel-partners', partnerId);
    }

    if (subChannelId) {
        segments.push('subchannel', subChannelId);
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

    if (groupId && !['users', 'systems'].includes(tabId)) {
        segments.pop();
    }

    return [...segments].join('/');
};
