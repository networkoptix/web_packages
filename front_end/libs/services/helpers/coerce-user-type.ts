import { SystemUser, UserType } from '../system-user.types';

export const coerceUserType = (user: SystemUser): string => {
    if (!('type' in user)) {
        if ('isCloud' in user && !!user.isCloud) {
            return UserType.cloud;
        } else if ('isLdap' in user && !!user.isLdap) {
            return UserType.ldap;
        } else {
            return UserType.local;
        }
    }
    return user.type;
};
