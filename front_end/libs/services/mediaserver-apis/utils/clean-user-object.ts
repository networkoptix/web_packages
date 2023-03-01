import { pick } from 'lodash-es';

import { RestV1SaveUser } from '@services/system-api.types';

export function cleanUserObjectRest<U extends RestV1SaveUser>(user: U): RestV1SaveUser {
    const supportedFields: (keyof RestV1SaveUser)[] = [
        'id',
        'email',
        'name',
        'fullName',
        'userId',
        'userRoleId',
        'permissions',
        'isCloud',
        'isEnabled',
        'password',
        'type',
        'isOwner',
        'accessibleResources',
        'isHttpDigestEnabled',
    ];
    return pick(user, supportedFields);
}
