import { NxSystem } from '@services/system.service';

export function setupTest41System() : Partial<NxSystem> {
    return {
        cloudStorageSystemEnabled: false,
        mediaservers: null,
        resourceTypes: null,
        canMerge: true,
        id: 'c27aaff0-0694-469b-a8d6-c43cd8a9648c',
        info: {
            name: '4.1_dev_storage',
            id: 'c27aaff0-0694-469b-a8d6-c43cd8a9648c',
            customization: 'default',
            authKey: '36b03b54-263f-411f-bcff-5605e937966c',
            ownerAccountEmail: 'noptixautoqa+owner@gmail.com',
            status: 'activated',
            cloudConnectionSubscriptionStatus: true,
            systemSequence: 32795,
            opaque: '{"localSystemId":"{6c0649c5-32c2-4e12-b7da-a0308cde80b7}"}',
            registrationTime: '1603409608520',
            ownerFullName: 'testFirstName testLastName',
            accessRole: 'owner',
            sharingPermissions: [
                {
                    accessRole: 'maintenance'
                },
                {
                    accessRole: 'liveViewer'
                },
                {
                    accessRole: 'viewer'
                },
                {
                    accessRole: 'advancedViewer'
                },
                {
                    accessRole: 'localAdmin'
                },
                {
                    accessRole: 'cloudAdmin'
                }
            ],
            stateOfHealth: 'online',
            usageFrequency: 64,
            lastLoginTime: '1603409608555',
            capabilities: {
                advanced_lens_control: 1,
                camera_auth_server_side_encryption: 1,
                cloudMerge: 1,
                get_time_of_servers_version: 2,
                layoutApiVersion: 1,
                mediaserver_metrics: 1,
                merge_history: 1,
                merge_systems: 1,
                primaryTimeServerDefinesInternetTimeSync: 1,
                restartMethodVersion: 2,
                set_camera_param_post: 1,
                vms_metrics: 1
            },
            isMine: true,
            canMerge: 1
        },
        isAvailable: true,
        isOnline: true,
        stateMessage: '',
        subscriberCount: 2,
        show404: false,
        currentServerNotBusy: true,
        currentUserEmail: 'noptixautoqa+owner@gmail.com'
    };
}

export function setupTest50System(): Partial<NxSystem> {
    return {
        cloudStorageSystemEnabled: false,
        mediaservers: null,
        resourceTypes: null,
        canMerge: true,
        id: 'c27aaff0-0694-469b-a8d6-c43cd8a9648c',
        useRest: true,
        info: {
            name: '5.0_dev_storage',
            id: 'c27aaff0-0694-469b-a8d6-c43cd8a9648c',
            customization: 'default',
            authKey: '36b03b54-263f-411f-bcff-5605e937966c',
            ownerAccountEmail: 'noptixautoqa+owner@gmail.com',
            status: 'activated',
            cloudConnectionSubscriptionStatus: true,
            systemSequence: 32795,
            opaque: '{"localSystemId":"{6c0649c5-32c2-4e12-b7da-a0308cde80b7}"}',
            registrationTime: '1603409608520',
            ownerFullName: 'testFirstName testLastName',
            accessRole: 'owner',
            sharingPermissions: [
                {
                    accessRole: 'maintenance'
                },
                {
                    accessRole: 'liveViewer'
                },
                {
                    accessRole: 'viewer'
                },
                {
                    accessRole: 'advancedViewer'
                },
                {
                    accessRole: 'localAdmin'
                },
                {
                    accessRole: 'cloudAdmin'
                }
            ],
            stateOfHealth: 'online',
            usageFrequency: 64,
            lastLoginTime: '1603409608555',
            capabilities: {
                advanced_lens_control: 1,
                camera_auth_server_side_encryption: 1,
                cloudMerge: 1,
                get_time_of_servers_version: 2,
                layoutApiVersion: 1,
                mediaserver_metrics: 1,
                merge_history: 1,
                merge_systems: 1,
                primaryTimeServerDefinesInternetTimeSync: 1,
                restartMethodVersion: 2,
                set_camera_param_post: 1,
                vms_metrics: 1
            },
            isMine: true,
            canMerge: 1
        },
        isAvailable: true,
        isOnline: true,
        stateMessage: '',
        subscriberCount: 2,
        show404: false,
        currentServerNotBusy: true,
        currentUserEmail: 'noptixautoqa+owner@gmail.com'
    };
}
