/* eslint-disable camelcase */

export interface CarouselImage {
        enter: string;
        leave: string;
    }

export interface Animations {
        carouselImage: CarouselImage;
    }

export interface ClientMode {
        beta: boolean;
        debug: boolean;
    }

export interface PasswordRequirements {
        maxLength: number;
        minClassesCount: number;
        minLength: number;
        requiredRegex: string;
        strongClassesCount: number;
    }

export interface CredentialsValidation {
        emailRegex: string;
        passwordRequirements: PasswordRequirements;
    }

export interface Subjects {
        integration: string[];
        ipvd_feedback_page: string[];
        ipvd_feedback_device: string[];
    }

export interface Type {
        ipvd_page: string;
        ipvd_device: string;
        integration: string;
        unknown: string;
    }

export interface Message {
        subjects: Subjects;
        type: Type;
    }

export interface Dialogs {
        message: Message;
    }

export interface Mobile {
        name: string;
        os: string;
    }

export interface Windows {
        name: string;
        os: string;
        appTypes: string[];
    }

export interface Linux {
        name: string;
        os: string;
        appTypes: string[];
    }

export interface Macos {
        name: string;
        os: string;
        appTypes: string[];
    }

export interface Arm {
        name: string;
        os: string;
        appTypes: string[];
    }

export interface Sdk {
        name: string;
        os: string;
        appTypes: string[];
    }

export interface Groups {
        windows: Windows;
        linux: Linux;
        macos: Macos;
        arm: Arm;
        sdk: Sdk;
    }

export interface PlatformMatch {
        unix: string;
        linux: string;
        mac: string;
        windows: string;
        arm: string;
        skd: string;
    }

export interface Downloads {
        mobile: Mobile[];
        groups: Groups;
        platformMatch: PlatformMatch;
    }

export interface Percent {
        multiplier: number;
        decimals: number;
    }

export interface TB {
        multiplier: number;
    }

export interface GB {
        multiplier: number;
    }

export interface MB {
        multiplier: number;
    }

export interface KB {
        multiplier: number;
    }

export interface B {
        multiplier: number;
    }

export interface GBps {
        display: string;
        multiplier: number;
        decimals: number;
    }

export interface MBps {
        display: string;
        multiplier: number;
        decimals: number;
    }

export interface KBps {
        display: string;
        multiplier: number;
        decimals: number;
    }

export interface Bps {
        display: string;
        multiplier: number;
        decimals: number;
    }

export interface Gbps {
        display: string;
        multiplier: number;
        decimals: number;
    }

export interface Mbps {
        display: string;
        multiplier: number;
        decimals: number;
    }

export interface Kbps {
        display: string;
        multiplier: number;
        decimals: number;
    }

export interface Bps2 {
        display: string;
        multiplier: number;
        decimals: number;
    }

export interface TransactionsS {
        multiplier: number;
        decimals: number;
    }

export interface TBS {
        multiplier: number;
    }

export interface GBS {
        multiplier: number;
    }

export interface MBS {
        multiplier: number;
    }

export interface KBS {
        multiplier: number;
    }

export interface BS {
        multiplier: number;
    }

export interface Tbit {
        multiplier: number;
    }

export interface Gbit {
        multiplier: number;
    }

export interface Mbit {
        multiplier: number;
    }

export interface Kbit {
        multiplier: number;
    }

export interface Bit {
        multiplier: number;
    }

export interface TbitS {
        multiplier: number;
    }

export interface GbitS {
        multiplier: number;
    }

export interface MbitS {
        multiplier: number;
    }

export interface KbitS {
        multiplier: number;
    }

export interface BitS {
        multiplier: number;
    }

export interface TPixS {
        multiplier: number;
    }

export interface GPixS {
        multiplier: number;
    }

export interface MPixS {
        multiplier: number;
    }

export interface KPixS {
        multiplier: number;
    }

export interface TrS {
        multiplier: number;
    }

export interface ValueFormats {
        '%': Percent;
        TB: TB;
        GB: GB;
        MB: MB;
        KB: KB;
        B: B;
        GBps: GBps;
        MBps: MBps;
        KBps: KBps;
        Bps: Bps;
        Gbps: Gbps;
        Mbps: Mbps;
        kbps: Kbps;
        bps: Bps2;
        'Transactions/s': TransactionsS;
        'TB/s': TBS;
        'GB/s': GBS;
        'MB/s': MBS;
        'KB/s': KBS;
        'B/s': BS;
        Tbit: Tbit;
        Gbit: Gbit;
        Mbit: Mbit;
        Kbit: Kbit;
        bit: Bit;
        'Tbit/s': TbitS;
        'Gbit/s': GbitS;
        'Mbit/s': MbitS;
        'Kbit/s': KbitS;
        'bit/s': BitS;
        'TPix/s': TPixS;
        'GPix/s': GPixS;
        'MPix/s': MPixS;
        'KPix/s': KPixS;
        'Tr/s': TrS;
    }

export interface ClassFormats {
        resource: string;
        longText: string;
        shortText: string;
        text: string;
        number: string;
        GB: string;
        KB: string;
        MB: string;
        TB: string;
        '%': string;
        'Mpix/s': string;
        'MB/s': string;
        'Mbit/s': string;
        'KB/s': string;
        'Kbit/s': string;
        'Tr/s': string;
        'unset': string;
    }

export interface HealthMonitoring {
        staleReportTimeout: number;
        valueFormats: ValueFormats;
        classFormats: ClassFormats;
    }

export interface Platform {
        name: string;
        src: string;
    }

export interface Icons {
        default: string;
        platforms: Platform[];
        dir: string;
        dirNonStandard: string;
        dirPagePlaceholder: string;
        dirSectionPlaceholder: string;
    }

export interface DefaultPlatformNames {
        'arm-64-file': string;
        'linux-x64-file': string;
        'macos-file': string;
        'arm-32-file': string;
        'windows-x64-file': string;
        downloadableInstructions: string;
    }

export interface Vimeo {
        link: string;
        regex: string;
    }

export interface Youtube {
        link: string;
        regex: string;
    }

export interface EmbedInfo {
        vimeo: Vimeo;
        youtube: Youtube;
    }

export interface Filter {
        items: string;
        limitation: string;
    }

export interface Integration {
        adminLink: string;
        defaultPlatformNames: DefaultPlatformNames;
        embedInfo: EmbedInfo;
        filter: Filter;
        myTagId: string;
    }

export interface Ipvd {
        pagerMaxSizeMedium: number;
        pagerMaxSize: number;
        firmwaresToShow: number;
        analyticsToShow: number;
        sortSupportedDevicesByPopularity: string;
        supportedResolutions: string;
        supportedHardwareTypes: string;
        searchTags: string;
        vendorsShown: string;
    }

export interface Table {
        rows: number;
    }

export interface TableLarge {
        rows: number;
    }

export interface Layout {
        table: Table;
        tableLarge: TableLarge;
    }

export interface Viewport {
        default: string;
        desktopLayout: string;
    }

export interface Meta {
        viewport: Viewport;
    }

export interface Settings {
        id: string;
        path: string;
    }

export interface Password {
        id: string;
        path: string;
    }

export interface Account {
        baseUrl: string;
        icon: string;
        settings: Settings;
        password: Password;
    }

export interface SystemHealth {
        baseUrl: string;
    }

export interface Admin {
        id: string;
        icon: string;
        path: string;
    }

export interface Users {
        id: string;
        icon: string;
        path: string;
    }

export interface Servers {
        id: string;
        icon: string;
        path: string;
    }

export interface Buttons {
        id: string;
    }

export interface SystemSettings {
        baseUrl: string;
        admin: Admin;
        users: Users;
        servers: Servers;
        buttons: Buttons;
    }

export interface Menus {
        account: Account;
        systemHealth: SystemHealth;
        systemSettings: SystemSettings;
    }

export interface Permissions {
        canViewRelease: string;
    }

export interface Redirect {
        authorised: string;
        unauthorised: string;
        page404: string;
        paths: string[];
    }

export interface Search {
        debounceTime: number;
        maxLength: number;
        minSystems: number;
    }

export interface Port {
        max: number;
        min: number;
        restrictedMax: number;
    }

export interface Status {
        online: string;
        offline: string;
        restarting: string;
        reseting: string;
        checking: string;
    }

export interface Servers2 {
        port: Port;
        status: Status;
    }

export interface Flags {
        newSystem: string;
    }

export interface Default {
        style: string;
    }

export interface Offline {
        style: string;
    }

export interface Unavailable {
        style: string;
    }

export interface Status2 {
        online: string;
        default: Default;
        offline: Offline;
        unavailable: Unavailable;
        master: string;
        slave: string;
    }

export interface System {
        flags: Flags;
        status: Status2;
        throttleTime: number;
    }

export interface Toast {
        success: string;
        warning: string;
        danger: string;
        info: string;
    }

export interface CloudCapabilities {
        feedbackEnabled: string;
        healthMonitor: string;
        integrationStore: string;
        publicDownloads: string;
        publicReleases: string;
    }

export interface Links {
        privacy: string;
        support: string;
        website: string;
    }

export interface Company {
        copyrightYear: string;
        links: Links;
        name: string;
    }

export interface CustomPermission {
        name: string;
        permissions: string;
    }

export interface PredefinedRole {
        isOwner?: boolean;
        name: string;
        permissions: string;
    }

export interface AccessRoles {
        adminAccess: string[];
        unshare: string;
        default: string;
        custom: string;
        editUserPermissionFlag: string;
        globalAdminPermissionFlag: string;
        customPermission: CustomPermission;
        predefinedRoles: PredefinedRole[];
        order: string[];
    }

export interface Debug {
        chunksOnTimeline: boolean;
    }

export interface Webclient {
        chunksToCheckFatal: number;
        disableVolume: boolean;
        endOfArchiveTime: number;
        flashChromelessDebugPath: string;
        flashChromelessPath: string;
        hlsLoadingTimeout: number;
        leftPanelPreviewHeight: number;
        maxCrashCount: number;
        nativeTimeout: number;
        playerReadyTimeout: number;
        reloadInterval: number;
        resetDisplayedTextTimer: number;
        staticResources: string;
        skipFramesRenderingTimeline: boolean;
        updateArchiveStateTimeout: number;
        updateArchiveRecordsTimeout: number;
        useServerTime: boolean;
        useSystemTime: boolean;
    }

export interface IConfig {
        alertTimeout: number;
        animations: Animations;
        apiBase: string;
        clientMode: ClientMode;
        credentialsValidation: CredentialsValidation;
        dialogs: Dialogs;
        downloads: Downloads;
        healthMonitoring: HealthMonitoring;
        icons: Icons;
        integration: Integration;
        ipvd: Ipvd;
        layout: Layout;
        maxServers: number;
        meta: Meta;
        menus: Menus;
        permissions: Permissions;
        redirect: Redirect;
        showHeaderAndFooter: boolean;
        search: Search;
        servers: Servers2;
        system: System;
        toast: Toast;
        cloudCapabilities: CloudCapabilities;
        cloudName: string;
        company: Company;
        footerItems: string;
        googleTagManagerId: string;
        pushConfig: string;
        trafficRelayHost: string;
        vmsName: string;
        accessRoles: AccessRoles;
        allowBetaMode: boolean;
        allowDebugMode: boolean;
        debug: Debug;
        gatewayUrl: string;
        globalViewArchivePermission: string;
        openClientTimeout: number;
        openClientError: string;
        openMobileClientTimeout: number;
        responseOk: string;
        timelineMouseEventTimeout: number;
        updateInterval: number;
        webclient: Webclient;
    }
