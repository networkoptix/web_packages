import { OrganizationUser } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export interface OrgUserExt extends OrganizationUser {
    userId: string;
    fullName: string;
    accessLevel: string[];
}
