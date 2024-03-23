export const OrgPermissions = {
    manage_systems: 'manage_systems',
    manage_users: 'manage_users',
    configure_organization: 'configure_organization',
    view_service_reports: 'view_service_reports',
    view_health_monitoring: 'view_health_monitoring',
    access_systems: 'access_systems',
} as const;

export const ChannelPartnerPermissions = {
    configure_channel_partner: 'configure_channel_partner',
    manage_users: 'manage_users',
    add_remove_sub_channel_partners: 'add_remove_sub_channel_partners',
    add_remove_organizations: 'add_remove_organizations',
    alter_state_sub_channel_partners: 'alter_state_sub_channel_partners',
    alter_state_organizations: 'alter_state_organizations',
    administer_organization_systems: 'administer_organization_systems',
    view_service_reports: 'view_service_reports',
    add_remove_service_quantities: 'add_remove_service_quantities',
} as const;
