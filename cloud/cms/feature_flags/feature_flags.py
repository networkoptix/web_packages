class_builtins = object.__dict__.keys()


class _FlagType(type):
    def __getattribute__(self, name):
        attr = super().__getattribute__(name)
        if name not in class_builtins and not name.startswith('_') and not name.endswith('_') and type(attr) is tuple:
            return attr[0]
        return attr

    def __getitem__(self, item):
        if item not in class_builtins and type(item) is str and not item.startswith('_') and not item.endswith('_'):
            attr = super().__getattribute__(item)
            if type(attr) is tuple:
                return attr[0]
        raise KeyError(item)

    @property
    def all_keys(self):
        return [
            key for key, item in self.__dict__.items()
            if key not in class_builtins and not key.startswith('_') and not key.endswith('_') and type(item) is tuple
        ]

    def json_key(self, name):
        attr = super().__getattribute__(name)
        return attr[1]

    def value_to_key(self, value):
        for key in self.all_keys:
            if value in super().__getattribute__(key):
                return key
        return None

    def data_structure_name(self, name):
        attr = super().__getattribute__(name)
        return attr[2] if len(attr) >= 3 else ''


class FLAGS(metaclass=_FlagType):
    # python_name = ('Human-readable and actual name', 'jsonKey', 'global_data_structure')
    # Since https://networkoptix.atlassian.net/browse/CLOUD-11189 `global_data_structure` is
    # no longer required to configure flag on a customization level.
    custom_clients = ('Custom Clients', 'customClients',
                      '%PUBLIC_CUSTOM_CLIENTS%')
    zendesk_sync = ('Zendesk Sync', 'zendeskSync', '%ZENDESK_SYNC%')
    alexa_integration = ('Alexa Integration',
                         'alexaIntegration', '%ALEXA_INTEGRATION_ENABLED%')
    bookmarks = ('View Bookmarks', 'bookmarks', '%BOOKMARKS_ENABLED%')
    dashboard = ('Dashboard', 'dashboard', '%DASHBOARD_ENABLED%')
    dashboard_redirect = ('Dashboard Redirect', 'dashboardRedirect', '%DASHBOARD_REDIRECT_ENABLED%')
    merge_refactor = ('Merge Refactor', 'mergeRefactorEnabled')
    archive_selection = ('Archive Selection', 'archiveSelection', '%ARCHIVE_SELECTION_ENABLED%')
    view_camera_details = ('View Camera Details', 'viewCameraDetails', '%VIEW_CAMERA_DETAILS_ENABLED%')
    themes_enabled = ('Enable themes', 'themesEnabled', '%THEMES_ENABLED%')
    theme_generator = ('Enable theme generator', 'themeGenerator', '%THEME_GENERATOR%')
    users_with_groups = ('Users With Groups', 'usersWithGroups', '%USERS_WITH_GROUPS%')
    cloud_ownership_transfer = ('Cloud Ownership Transfer', 'cloudOwnershipTransfer', '%CLOUD_OWNERSHIP_TRANSFER%')
    new_header = ('New Header', 'newHeader', '%NEW_HEADER_ENABLED%')
    cloud_storage = ('Cloud Storage', 'cloudStorage', '%CLOUD_STORAGE_FEATURE_ENABLED%')
    log_rocket = ('Log Rocket', 'logRocket', '%LOGROCKET_ENABLED%')
    full_story = ('Full Story', 'fullStory', '%FULLSTORY_ENABLED%')
    require_tos_agreement = ('TOS Agreement required', 'tosRequired', '%TOS_AGREEMENT_REQUIRED%')
    cookie_banner = ('Cookie Banner', 'cookieBanner', '%COOKIE_BANNER%')
    s3_static = ('S3 Static Files Enabled', 's3Static', '%S3_STATIC_ENABLED%')
    db_static = ('DB Static Files Enabled', 'dbStatic', '%DB_STATIC_ENABLED%')
    ipvd_update = ('IPVD Update', 'ipvdUpdate')

    layouts = ('Layouts', 'layouts', '%LAYOUTS_ENABLED%')
    layouts_editable = ('Layouts Editable', 'layoutsEditable', '%LAYOUTS_EDITABLE%')
    layouts_share = ('Layouts Share', 'layoutsShare', '%LAYOUTS_SHARE%')
    layouts_helper = ('Layouts Helper', 'layoutsHelper', '%LAYOUTS_HELPER%')
    layouts_authorize_camera = ('Layouts let user authorize a camera', 'layoutsAuthorizeCamera', '%LAYOUTS_AUTHORIZE_CAMERA%')
    layouts_servers = ('Layouts Servers', 'layoutsServers', '%LAYOUTS_SERVERS%')
    layouts_webpages = ('Layouts Webpages', 'layoutsWebpages', '%LAYOUTS_WEBPAGES%')
    layouts_tour = ('Layouts Tour', 'layoutsTour', '%LAYOUTS_TOUR%')
    layouts_right_menu = ('Layouts Right Menu', 'layoutsRightMenu', '%LAYOUTS_RIGHT_ENABLED%')
    layouts_timeline = ('Layouts Timeline', 'layoutsTimeline', '%LAYOUTS_TIMELINE_ENABLED%')
    layouts_ptz_control = ('Layouts PTZ Control', 'layoutsPtz', '%LAYOUTS_PTZ_ENABLED%')
    layouts_demo = ('Layouts Demo', 'layoutsDemo', '%LAYOUTS_DEMO_ENABLED%')
    layouts_io_devices = ('Layouts IO Devices', 'layoutsIoDevices', '%LAYOUTS_IO_DEVICES_ENABLED%')
    layouts_non_chrome = ('Layouts Non-Chromium Browsers', 'layoutsNonChrome', '%LAYOUTS_NON_CHROME%')
    layouts_device_settings = ('Layouts device settings', 'layoutsDeviceSettings', '%LAYOUTS_DEVICE_SETTINGS%')
    layouts_unsaved_sync = ('Layouts - Sync Unsaved Layouts Across Sessions', 'layoutsUnsavedSync', '%LAYOUTS_UNSAVED_SYNC%')
    layouts_remove_item_dialog = ('Layouts - Removing Item Confirmation Dialog', 'layoutsRemoveItemDialog', '%LAYOUTS_REMOVE_ITEM_DIALOG%')
    layouts_change_resolution = ('Layouts - Item Resolution', 'layoutsChangeResolution', '%LAYOUTS_CHANGE_RESOLUTION%')
    layouts_item_change_resolution = ('Layouts - Layout Resolution', 'layoutsItemChangeResolution', '%LAYOUTS_ITEM_CHANGE_RESOLUTION%')
    layouts_item_status = ('Layouts - Layout Item Status (bottom right)', 'layoutsItemStatus', '%LAYOUTS_ITEM_STATUS%')
    layouts_cross_system = ('Layouts - Cross System Layouts', 'layoutsCrossSystem', '%LAYOUTS_CROSS_SYSTEM%')
    layouts_cross_editing = ('Layouts - Other Systems and Full Cross System Layout Editing', 'layoutsCrossSystemEditing', '%LAYOUTS_CROSS_SYSTEM_EDITING%')
    layouts_updated_cross_system_menu = ('Layouts - Updated Cross System Menu (separated from the tree)', 'layoutsUpdatedCrossSystemMenu')
    layouts_camera_groups = ('Layouts - Tree Camera Groups', 'layoutsCameraGroups')
    layouts_item_new_placeholder = ('Layouts - New Items Placeholders', 'layoutsItemNewPlaceholder')
    layouts_item_debug_placeholder = ('Layouts - Dev Debug Info Placeholders', 'layoutsDebugPlaceholder')
    layouts_fisheye = ('Layouts - Fisheye De-warping', 'layoutsFisheye')
    layouts_51_enabled = ('Layouts - Enabled for 5.1 Systems', 'layouts51Enabled')
    layouts_show_beta_tag = ('Layouts - Show Beta Tag in header', 'layoutsShowBetaTag')

    use_json_rpc = ('Use Json Rpc', 'useJsonRpc', '%USE_JSON_RPC%')

    channel_partners = ('Chanel Partners', 'channelPartners', '%CHANNEL_PARTNERS_ENABLED%')
    channel_partners_change_state_ui = ('Channel Partners Change State UI', 'channelPartnersChangeStateUI')
    channel_partners_create_partner_ui = ('Channel Partners Create Partner UI', 'channelPartnersCreatePartnerUI')
    channel_partners_change_services_ui = ('Channel Partners Change Services UI', 'channelPartnersChangeServicesUI')
    channel_partners_reports_ui = ('Channel Partners Reports UI', 'channelPartnersReportsUI')
    channel_partners_support_ui = ('Channel Partners Support UI', 'channelPartnersSupportUI')
    channel_partners_access_service_usage = ('Channel Partners - Access Usage Reports', 'channelPartnersAccessServiceUsage')

    rest_cookie_login = ('Rest Cookie Login', 'restCookieLogin')

    request_caching = ('Request Caching', 'requestCaching', '%REQUEST_CACHING_ENABLED%')
    request_caching_remote_sync = ('Request Caching Remote Sync', 'requestCachingRemoteSync', '%REQUEST_CACHING_REMOTE_SYNC_ENABLED%')

    cross_tab_sync_enabled = ('Cross Tab Sync Enabled', 'crossTabSyncEnabled', '%CROSS_TAB_SYNC_ENABLED%')
    use_authentication_interceptor = ('Use Authentication Interceptor', 'useAuthenticationInterceptor', '%USE_AUTHENTICATION_INTERCEPTOR%')
    use_500_error_interceptor = ('Use 500 Error Interceptor', 'use500ErrorInterceptor', '%USE_500_ERROR_INTERCEPTOR%')
    bookmark_sharing = ('Enable Bookmark Sharing', 'bookmarkSharing')

    # beta features
    access_integration_store = ('Lets the desktop client know if the integration store is enabled.',
                                'accessIntegrationStore', '%INTEGRATION_STORE_ENABLED%')
    access_developers = ('Enable For Developers pages.', 'accessDevelopers', '%DEVELOPERS_ENABLED%')
    enhanced_downloads = ('Enable Enhanced Downloads pages.', 'enhancedDownloads')

    # TODO: Remove this with https://networkoptix.atlassian.net/browse/CLOUD-8667 *********
    five_r = ('Paginator(experimental)', 'paginatorExperimental', '%FIVE_R_ENABLED%')
    # *************************************************************************************

    def __getattribute__(self, name):
        return dict(FLAGS).get(name)


class SWITCHES(metaclass=_FlagType):
    landing_page = ('Landing Page', 'landingPage')
    kb_instant_search = ('KnowledgeBase Instant Search', 'kbInstantSearch')
    server_side_meta = ('Server Side Metadata', 'serverSideMetadata')
    readonly_apis = ('Readonly APIs', 'readonlyAPIs')


class SAMPLES(metaclass=_FlagType):
    pass
