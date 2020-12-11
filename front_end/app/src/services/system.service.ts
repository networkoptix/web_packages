import { Injectable, OnDestroy } from '@angular/core';
import {
    BehaviorSubject, of, Subscription, Observable, from
}                                from 'rxjs';
import { flatMap, tap }          from 'rxjs/operators';

import { environment } from '@environments/environment';
import { NxConfigService, IConfig }        from './nx-config';
import { NxLanguageProviderService }       from './nx-language-provider';
import { NxCloudApiService }               from './nx-cloud-api';
import {
    NxSystemsService, NxSystemWithUserInfo
}                                          from './systems.service';
import {
    NxSystemAPIService, NxSystemAPI, ResourceParam
}                                          from './system-api.service';
import { NxPollService }                   from './poll.service';
import { NxUtilsService }                  from './utils.service';
import { NxAppStateService }               from './nx-app-state.service';
import { PredefinedRole }                  from './nx-config/base-config';
import { SystemConfigSettings }            from './system-api.types';
import { LanguageI18NStaticTypes }         from '@app/language_i18n_static_types';
import { trim_ids } from '../utils/api_response_cleaners';
import { NxRibbonService } from '@components/ribbon';

interface IParams<Value = any> {
    [key: string]: Value;
}

export interface NxSystemRole extends PredefinedRole {
    id?: string;
    isAdmin?: boolean;
    label?: string;
}

export interface NxSystemUser {
    isLocalOwner: boolean;
    accessRole: string;
    accessRights: { [resourceId: string]: true };
    canBeDeleted: boolean;
    canBeEdited: boolean;
    cryptSha512Hash: string;
    digest: string;
    email: string;
    fullName: string;
    hash: string;
    id: string;
    isAdmin: boolean;
    isCloud: boolean;
    isEnabled: boolean;
    isLdap: boolean;
    isLocalAdmin: boolean;
    isCloudOwner: boolean;
    isMe: boolean;
    name: string;
    parentId: string;
    permissions: string;
    realm: string;
    role: NxSystemRole;
    typeId: string;
    url: string;
    userId: string;
    userRoleId: string;
}

export interface NxSystemServer {
    addParams: string[];
    allowAutoRedundancy: boolean;
    authKey: string;
    backupBitrate: number;
    backupDaysOfTheWeek: string;
    backupDuration: number;
    backupStart: number;
    backupType: string;
    flags: string;
    id: string;
    ip: string;
    maxCameras: number;
    metadataStorageId: string;
    name: string;
    networkAddresses: string;
    osInfo: string;
    parentId: string;
    status: string;
    storage: any[]; // TODO: Can probably remove
    systemInfo: string;
    typeId: string;
    url: string;
    version: string;
}
/**
 * This type needs to be defined
 */
interface IMergeInfo {
    [key: string]: any
}

class SystemInterface {
    canMerge: boolean;
    cloudStorageCapable: boolean;
    id: string;
    info: Partial<NxSystemWithUserInfo>;
    isOnline: boolean;
    mergeInfo: IMergeInfo;
    stateMessage: string;
    servers: NxSystemServer[];
}

class SystemPermissions {
    editAdmins = false;
    editUsers = false;
    isAdmin = false;
    editCameras = false;
}

interface ModuleInfo {
    brand: string,
    cloudHost: string,
    cloudSystemId: string
    customization: string;
    ecDbReadOnly: boolean;
    hwPlatform: string;
    id: string;
    localSystemId: string;
    name: string;
    osInfo: {
        platform: string;
        variant: string;
        variantVersion: string;
    };
    port: number;
    protoVersion: number;
    realm?: string;
    remoteAddresses: string[];
    runtimeId: string;
    serverFlags: string;
    sslAllowed: boolean;
    status?: string;
    systemName: string;
    type: string;
    version: string;
}

// <added by @gbezyuk for watch component>

export interface ServerTimeInfo {
    vmsTimeOffset: number,
    osTimeOffset: number,
    serverId: string, // supposed to be stripped of {} around the UUID
    timeZoneOffset: number,
}

interface NameValue {
    name: string,
    value: string,
}

export interface NxCamera {
    id: string;
    preferredServerId: string;
    name: string;
    url: string;
    status: string; // TODO: enum (@gbezyuk)
    scheduleEnabled: boolean,
    addParams: Array<NameValue>,
}

export interface NxMediaServer {
    id: string;
    name: string;
    url: string;

    timeInfo: ServerTimeInfo,

    // considered obligatory for now, though may change later on (@gbezyuk)
    cameras: NxCamera[];
}
// </added by @gbezyuk for watch component>

class System extends SystemInterface {
    protected _isAvailable: boolean;
    cloudStorageSystemEnabled = false;

    // <added by @gbezyuk for watch component>
    mediaservers: NxMediaServer[] = null
    resourceTypes: any[] = null
    // </added by @gbezyuk for watch component>

    constructor() {
        super();
        this.canMerge = false;
        this.id = '';
        this.info = undefined;
        this._isAvailable = false;
        this.isOnline = false;
        this.mergeInfo = undefined;
        this.stateMessage = '';
    }
}

class UserManager {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    private mediaserver: NxSystemAPI;
    private _ownerEmail: string;
    private _accessRole: string = '';
    private _userId: string;
    accessRoles: NxSystemRole[];
    currentUser: NxSystemUser;
    currentUserEmail: string;
    isMine: boolean;
    permissions: SystemPermissions;
    users: NxSystemUser[];

    constructor(config: IConfig, lang: LanguageI18NStaticTypes, mediaserver: NxSystemAPI, currentUserEmail: string, userId: string) {
        this.CONFIG = config;
        this.LANG = lang;
        this.mediaserver = mediaserver;
        this.currentUserEmail = currentUserEmail;

        this._ownerEmail = '';
        this._accessRole = '';
        this._userId = userId;
        this.accessRoles = this.CONFIG.accessRoles.predefinedRoles;
        this.isMine = false;
        this.permissions = new SystemPermissions();
    }

    get accessRole() {
        return this._accessRole;
    }

    set accessRole(accessRole) {
        this._accessRole = accessRole || '';
        this.checkPermissions();
    }

    // eslint-disable-next-line accessor-pairs
    set ownerEmail(email: string) {
        this._ownerEmail = email;
        this.isMine = this.currentUserEmail === email || this.currentUser?.isLocalOwner;
    }

    isAdmin(user: NxSystemRole) {
        return user.permissions && user.permissions.indexOf(this.CONFIG.accessRoles.globalAdminPermissionFlag) >= 0;
    }

    isEmptyGuid(guid?: string) {
        return guid
            ? guid.replace(/[{}0-]/gi, '') === ''
            : true;
    }

    isOwner(user: NxSystemUser) {
        return user?.isLocalOwner || user?.isCloud && user?.email === this._ownerEmail;
    }

    checkPermissions() {
        const isMine                         = this.isMine || this.currentUser?.isLocalOwner;
        const permissions: SystemPermissions = {
            editAdmins  : isMine,
            editUsers   : isMine,
            isAdmin     : isMine,
            editCameras : isMine
        };
        if (!isMine && this.currentUser) {
            permissions.editUsers = this.currentUser.permissions.indexOf(this.CONFIG.accessRoles.editUserPermissionFlag) >= 0;
            permissions.isAdmin = this.isAdmin(this.currentUser);
            permissions.editCameras = this.currentUser.permissions.indexOf(this.CONFIG.accessRoles.editCameraPermissionFlag) >= 0;
        } else if (this.CONFIG.accessRoles.adminAccess.indexOf(this._accessRole.toLowerCase()) > -1) {
            permissions.editUsers = true;
            permissions.isAdmin = true;
            permissions.editCameras = true;
        }

        this.permissions = permissions;
    }

    deleteUser(removedUser: NxSystemUser) {
        return this.mediaserver.deleteUser(removedUser.id).toPromise()
            .then(data => {
                this.users = this.users.filter((user) => {
                    return user.id !== data.id;
                });
            })
            .catch(() => {});
    }

    findAccessRole(user: NxSystemUser) {
        const roles = this.accessRoles || this.CONFIG.accessRoles.predefinedRoles;
        // TODO Need to figure out role type here
        let role: any  = roles.find((role: any) => {
            // Owner flag has top priority and overrides everything
            if (role.isOwner) {
                return this.isOwner(user);
            }
            if (!this.isEmptyGuid(role.id)) {
                return role.id === user.userRoleId;
            }

            // Admins has second priority
            if (this.isAdmin(role)) {
                return this.isAdmin(user);
            }
            return role.permissions === user.permissions;
        });
        // handles the Custom role
        if (!role) {
            role = NxUtilsService.deepCopy(roles[roles.length - 1]);
            role.isAdmin = this.isAdmin(user);
            role.permissions = user.permissions;
        }

        return role || roles[roles.length - 1];
    }

    getUsersDataFromTheSystem(): Promise<NxSystemUser[] | string | false> {
        return this.mediaserver.getAggregatedUsersData().toPromise().then((result: any) => {
            if (!result) {
                // eslint-disable-next-line prefer-promise-reject-errors
                return Promise.reject(`Aggregated request to server has failed ${result}`);
            }
            const data = result.reply;
            const users = data['ec2/getUsers'];
            const userRoles = data['ec2/getUserRoles'];
            const predefinedRoles = data['ec2/getPredefinedRoles'];
            const accessRights = data['ec2/getAccessRights'];
            return new Promise((resolve) => {
                this.updateAccessRoles(predefinedRoles, userRoles);
                return resolve(this.processUsers(users, accessRights));
            });
        }, () => {
            // eslint-disable-next-line prefer-promise-reject-errors
            return Promise.reject('Media server cloud not be reached.');
        });
    }

    normalizePermissionString(permissions: string): string {
        return permissions.split('|').sort().join('|');
    }

    processUsers(users: NxSystemUser[], accessRights = []) {
        if (!Array.isArray(users)) {
            return false;
        }
        // accessRights if individual camera permissions ever set
        accessRights = Object.keys(accessRights).length ? accessRights.reduce((obj, next) => {
            obj[next.userId] = next.resourceIds;
            return obj;
        }, {}) : {};
        // const accessRightsAssoc = _.indexBy(accessRights,'userId'); // Leave commented out
        this.users = users.map((user) => {
            // @ts-ignore: TODO Can't resolve accountFullName, NxSystemUser interface might be missing properties
            if (user.accountFullName && !user.fullName) {
                // @ts-ignore TODO Can't resolve accountFullName, NxSystemUser interface might be missing properties
                user.fullName = user.accountFullName;
            }
            user.permissions = this.normalizePermissionString(user.permissions);
            user.role = this.findAccessRole(user);
            user.accessRole = user.role.name;
            // allMediaPermissionFlag exists if the all camera permission option selected
            if (!user.permissions.includes(this.CONFIG.accessRoles.allMediaPermissionFlag) && accessRights[user.id]) {
                user.accessRights = accessRights[user.id].reduce((obj: { [resourceId: string]: true }, next: string) => {
                    obj[next] = true;
                    return obj;
                }, {});
            }
            // @ts-ignore: TODO Can't resolve accountID, NxSystemUser interface might be missing properties
            user.id = user.id || user.accountId;
            user.isCloudOwner = this.isOwner(user);
            user.isMe = !this.CONFIG.isLocal ? user.isCloud && user.email === this.currentUserEmail : user.id === this._userId;
            user.isAdmin = this.isAdmin(user);
            // @ts-ignore: TODO having trouble resolving type for isLocalOwner
            user.isLocalOwner = !user.isCloud && user.name === 'admin';

            /**
             * User can not be edited if:
             * - this user is the current user
             * - this user is the local owner (local 'admin')
             * - this user is the cloud owner
             *
             * Furthermore, if the system is not mine and the user is an admin,
             *   they also can not be edited
             */
            // @ts-ignore: TODO having trouble resolving type for isLocalOwner
            const isNotMeOrOwner = !(user.isMe || user.isLocalOwner || user.isCloudOwner);
            user.canBeEdited = isNotMeOrOwner && (this.isMine || !user.isAdmin);

            if (user.isMe) {
                this.currentUser = user;
                this.accessRole = user.accessRole;
            }

            return user;
        }).sort((userA, userB) => {
            // sorts local before cloud users --> then by email for cloud & name for local
            if (userA.isCloud === userB.isCloud) {
                if (userA.isCloud) {
                    return userA.email < userB.email ? -1 : 1;
                } else {
                    return userA.name < userB.name ? -1 : 1;
                }
            }
            return userA.isCloud ? 1 : -1;
        });

        return this.users;
    }

    saveUser(user: NxSystemUser, role: NxSystemRole) {
        user.email = user.email.toLowerCase();
        let userCreated = false;
        if (user.email === this.currentUserEmail) {
            if (user.isCloud) {
                // eslint-disable-next-line prefer-promise-reject-errors
                return Promise.reject({ resultCode: 'cantAddYourOwnEmail' });
            }
        }

        if (!user.id) {
            let existingUser: Partial<NxSystemUser> = this.users.find((u) => {
                return user.email === u.email;
            });
            if (!existingUser) { // user not found - create a new one
                userCreated = true;
                existingUser = this.mediaserver.userObject(user.fullName, user.email);
            }
            user = { ...existingUser, ...user };
        }

        if (!user.canBeEdited && !this.isMine) {
            // eslint-disable-next-line prefer-promise-reject-errors
            return Promise.reject({ resultCode: 'cantEditAdmin' });
        }

        user.userRoleId = role.id || '';
        user.permissions = role.permissions || '';

        // TODO: remove later
        // this.cloudApi.share(this.id, user.email, accessRole);

        return this.mediaserver.saveUser(user).toPromise().then(result => {
            user.id = result.id;
            user.role = role;
            user.accessRole = role.name || role.label;
            if (userCreated) {
                this.users.push(user);
            }
            return result;
        });
    }

    updateAccessRoles(predefinedRoles: NxSystemRole[], userDefinedRoles: NxSystemRole[]) {
        predefinedRoles.forEach((role: NxSystemRole) => {
            role.permissions = this.normalizePermissionString(role.permissions);
            role.isAdmin = this.isAdmin(role);
        });

        const userRolesList = userDefinedRoles.map((userRole: NxSystemRole) => {
            userRole.isAdmin = this.isAdmin(userRole);
            userRole.permissions = this.normalizePermissionString(userRole.permissions);
            return userRole;
        }).sort((userRoleA, userRoleB) => {
            return userRoleA.name < userRoleB.name ? -1 : 1;
        });

        const newRoles = Array.from(new Set([...predefinedRoles, ...userRolesList, this.CONFIG.accessRoles.customPermission]));
        if (!NxUtilsService.isEqual(newRoles, this.accessRoles)) {
            this.accessRoles = newRoles;
        }
        return this.accessRoles;
    }
}

class ServerManager {
    mediaserverConnections: {
        [serverId: string]: NxSystemAPI
    };

    servers: NxSystemServer[];
    cameras: ICamera[];
    moduleInfo: ModuleInfo;

    constructor(private mediaserver: NxSystemAPI,
                private systemApiService: NxSystemAPIService,
                private currentUserEmail: string,
                private systemId: string,
                private cloudApi: NxCloudApiService
    ) {
    }

    initSystemMediaServers() {
        if (this.servers.length) {
            this.mediaserverConnections = this.servers.reduce((mediaserverConnections, server) => {
                const unauthorizedCallback = environment.isLocal
                    ? () => Promise.resolve()
                    : () => this.cloudApi.getSystemAuth(this.systemId).toPromise().then((authKeys: any) => {
                        this.mediaserver.setAuthKeys(authKeys.authGet, authKeys.authPost, authKeys.authPlay);
                        return Promise.resolve(true);
                    });
                mediaserverConnections[server.id] = this.systemApiService
                    .createConnection(
                        this.currentUserEmail,
                        this.systemId,
                        server.id,
                        unauthorizedCallback
                    );
                const { authGet, authPost, authPlay } = this.mediaserver.getAuthKeys();
                mediaserverConnections[server.id].setAuthKeys(authGet, authPost, authPlay);
                return mediaserverConnections;
            }, {});
            return Promise.resolve(this.mediaserverConnections);
        }
        return Promise.reject();
    }

    async updateSystemServersCameras() {
        try {
            const response = await this.mediaserver.updateSystemServersCameras().toPromise();
            const [moduleInfo, servers, serverTimes, cameras] = response;
            this.moduleInfo = moduleInfo;
            this.servers = servers.sort(NxUtilsService.byParam((server: any) => server.name, NxUtilsService.sortASC));
            this.getCameras(serverTimes, cameras);
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(Error(`Request to server has failed ${error}`));
        }
    }

    getServers(servers?) {
        return this.getForceServers(true, servers);
    }

    getForceServers(useCache, servers?) {
        if (!servers) {
            const serverSubscription = this.mediaserver.getMediaServers(useCache);
            serverSubscription.subscribe((res: any) => {
                if (!res) {
                    return Promise.reject(new Error(`Request to server has failed ${res}`));
                }

                this.servers = res.sort(NxUtilsService.byParam((server: any) => server.name, NxUtilsService.sortASC));
                return this.servers;
            });
            return serverSubscription;
        } else {
            this.servers = servers.sort(NxUtilsService.byParam((server: any) => server.name, NxUtilsService.sortASC));
        }
    }

    getPreviewUrl(cameraId, time, width, height, rotate) {
        return this.mediaserver.previewUrl(cameraId, time, width, height, rotate);
    }

    async getCameras(serverTimes?, cameras?) {
        if (!serverTimes || !cameras) {
            [serverTimes, cameras] = await this.mediaserver.getCamerasWithSeverTime().toPromise();
            if (!cameras) {
                return Promise.reject(new Error(`Request to server has failed ${cameras}`));
            }
        }
        const mappedCameras = await <ICamera[]> cameras.map(({ addParams: addParamsRaw, parentId, id, vendor, ...camera }: ICamera) => {
            const server = serverTimes.find(({ serverId }) => serverId === parentId);
            let dayOfWeek;
            let secondsToday;
            if (server) {
                const { timeZoneOffset, vmsTime } = server;
                const serverTime = parseInt(vmsTime) + parseInt(timeZoneOffset);
                const vmsDate = new Date(serverTime);
                dayOfWeek = ((vmsDate.getDay() + 6) % 7) + 1;
                secondsToday = Math.round((serverTime % 86400000) / 1000);
            }
            const {
                rotation,
                overrideAr,
                mediaCapabilities,
                isAudioSupported: audioSupported,
                motionStream,
                ...parsedAddParams
            }: any = addParamsRaw.filter(({ name }) => [
                'rotation',
                'overrideAr',
                'mediaCapabilities',
                'isAudioSupported',
                'supportedMotion',
                'motionStream',
                'credentials',
                'hasDualStreaming',
                'bitrateInfos'
            ].includes(name)).reduce((params, { name, value }) => {
                params[name] = value;
                return params;
            }, {});
            const parentName = this.servers.find(server => server.id === parentId)?.name;
            const isAudioSupported = !!audioSupported;
            const streamCapabilities = mediaCapabilities && JSON.parse(mediaCapabilities).streamCapabilities;
            const primary = streamCapabilities && streamCapabilities.find(({ key }) => key === 'primary');
            const _maxFps = primary && primary.value && (primary.value.maxFps || primary.value.MaxFps);
            const maxFps = _maxFps || 15;
            const previewRotate = overrideAr === 1 ? rotation : rotation === 180 ? 180 : 0;
            const previewUrl = this.mediaserver.previewUrl(id, null, overrideAr * 120, 120, previewRotate);
            const status = this.parseCameraStatus(camera, { dayOfWeek, secondsToday });
            const isStream = ['GENERIC_RTSP', 'GENERIC_MULTICAST', 'GENERIC_MULTICAST', 'HTTP_URL_PLUGIN'].includes(vendor);
            // eslint-disable-next-line no-use-before-define
            const motionEnabled = camera.motionType !== MotionType.noMotion;
            const { hasDualStreaming, bitrateInfos } = parsedAddParams;
            const multiStream = bitrateInfos && JSON.parse(bitrateInfos).streams.length >= 2;
            const motionLowresEnabled  = !camera.disableDualStreaming && (multiStream || !!hasDualStreaming);
            const recordingSettings: IRecordingSettings = {
                recording : camera.scheduleEnabled && !camera.scheduleTasks.every(({ fps }) => !fps),
                quality   : this.parseRecordingQuality(camera.scheduleTasks),
                fps       : this.parseFps(camera.scheduleTasks, maxFps),
                motionEnabled,
                modes     : [
                    { name: 'always', id: 'RT_Always', value: this.parseRecordingMode(camera, 'RT_Always'), enabled: true },
                    { name: 'motion', id: 'RT_MotionOnly', value: this.parseRecordingMode(camera, 'RT_MotionOnly'), enabled: motionEnabled },
                    {
                        name    : 'motionLowRes',
                        id      : 'RT_MotionAndLowQuality',
                        value   : !motionEnabled ? 0 : this.parseRecordingMode(camera, 'RT_MotionAndLowQuality'),
                        enabled : motionLowresEnabled && motionEnabled
                    }
                ]
            };
            return { ...camera, id, parentId, dayOfWeek, maxFps, addParamsRaw, motionEnabled, recordingSettings, parsedAddParams, isAudioSupported, secondsToday, parentName, previewUrl, rotation, status, overrideAr, mediaCapabilities, vendor, isStream, motionLowresEnabled };
        });
        this.cameras = mappedCameras;
        return mappedCameras;
    }

    setCameraUserSettings(serverId: string, id: string, params: { [key: string]: string }) {
        return this.mediaserverConnections[serverId].saveCameraUserSettings(id, params);
    }

    setServerUserSettings(serverId: string, params: { [key: string]: string }) {
        return this.mediaserverConnections[serverId].saveServerUserSettings(serverId, params);
    }

    updateSettings(resourceId: string, params: IParams) {
        const mappedParams: ResourceParam[] = Object.entries(params).map(([name, value]) => ({ name, value, resourceId }));
        return this.mediaserver.setResourceParams(mappedParams).toPromise();
    }

    updateOrGetBackupControl(serverId: string, action?: 'start' | 'stop') {
        return this.mediaserverConnections[serverId].backupControl(action);
    }

    updateRecordingSettings(updatedTask: Pick<ITask, 'fps' | 'recordingType' | 'streamQuality'> | false,
        cameraSettings: Pick<ICamera, 'id' | 'name' | 'audioEnabled' | 'scheduleEnabled' | 'overrideAr' | 'rotation'>) {
        const baseTask: Pick<ITask, 'bitrateKbps' | 'endTime' | 'startTime' | 'recordingType'> = updatedTask && cameraSettings.scheduleEnabled ? {
            bitrateKbps   : 0,
            endTime       : 86400,
            startTime     : 0,
            recordingType : updatedTask.recordingType
        } : {
            bitrateKbps   : 0,
            endTime       : 0,
            startTime     : 0,
            recordingType : 'RT_Never'
        };

        const updateParams: Partial<ICamera> | any = cameraSettings;

        const scheduleTasks: ITask[] = [];
        if (updatedTask && cameraSettings.scheduleEnabled) {
            for (let dayOfWeek = 1; dayOfWeek < 8; dayOfWeek++) {
                scheduleTasks.push({ ...updatedTask, ...baseTask, dayOfWeek });
            }
            updateParams.scheduleTasks = scheduleTasks;
        }
        return this.mediaserver.updateRecordingSettings(updateParams).toPromise();
    }

    private parseFps(schedule: ITask[], max: number): number | 'various' {
        const schedulesWithFps = schedule.filter(({ fps, recordingType }) => fps !== 0 && recordingType !== 'RT_Never').map(({ fps }) => fps);
        const uniqueFps = new Set(schedulesWithFps);
        const currentFps = Array.from(uniqueFps);
        return schedulesWithFps.length === 0 ? max : currentFps.length === 1 ? currentFps[0] : 'various';
    }

    private parseRecordingQuality(schedule: ITask[]) {
        const streamQualities: StreamQuality[] = ['low', 'normal', 'high', 'highest'];
        let quality: StreamQuality = schedule.length ? 'various' : 'high';
        for (const stream of streamQualities) {
            if (schedule.length && schedule.every(({ streamQuality }) => streamQuality === stream)) {
                quality = stream;
            }
        }
        return quality;
    }

    private parseRecordingMode({ scheduleTasks }: Partial<ICamera>, id: RecordingType) {
        const partialSchedule = scheduleTasks.some(({ recordingType, startTime, endTime, fps }) => (
            recordingType === id &&
            fps > 0 &&
            startTime < endTime
        ));

        const fullSchedule = scheduleTasks.length && scheduleTasks.every(({ recordingType, startTime, endTime, fps }) => (
            recordingType === id &&
            fps > 0 &&
            startTime < endTime
        ));
        return fullSchedule ? 2 : partialSchedule ? 1 : 0;
    }

    private parseCameraStatus({ status, scheduleEnabled, scheduleTasks }: Partial<ICamera>, { dayOfWeek, secondsToday }) {
        if (status !== 'Online' || !scheduleEnabled) {
            return status;
        }
        const recording = scheduleTasks.some(({ dayOfWeek: day, startTime, endTime, recordingType }) => (
            recordingType !== 'RT_Never' &&
            day === dayOfWeek &&
            startTime < secondsToday &&
            secondsToday < endTime
        ));
        if (recording) {
            return 'Recording';
        } else {
            return 'Scheduled';
        }
    }

    getLicenses() {
        return this.mediaserver.getLicenses().toPromise();
    }

    getModuleInfo(serverId?: string) {
        if (serverId) {
            return this.mediaserverConnections[serverId].getModuleInfo()
                .pipe(tap(moduleInfo => {
                    this.moduleInfo = moduleInfo.reply;
                }));
        } else {
            return this.mediaserver.getModuleInfo()
                .pipe(tap(moduleInfo => {
                    this.moduleInfo = moduleInfo.reply;
                }));
        }
    }

    changeServerPort(port: number, serverId: string) {
        return this.mediaserverConnections[serverId].changePort(port)
            .catch(err => Promise.reject(err));
    }

    logLevel(serverId: string) {
        return this.mediaserverConnections[serverId].logLevel().toPromise();
    }

    setLogLevels(serverId: string, loggers: IParams) {
        const promises = [];

        loggers.forEach((logger) => {
            promises.push(this.mediaserverConnections[serverId].logLevel(undefined, logger.key, logger.value).toPromise());
        });

        return Promise.all(promises)
            .then(() => {
                return Promise.resolve({});
            })
            .catch((error) => {
                return Promise.reject(new Error(error));
            });
    };

    activateLicense(serverId, key) {
        if (!this.mediaserverConnections) {
            return this.initSystemMediaServers()
                .then(() => {
                    return this.mediaserverConnections[serverId].activateLicense(key).toPromise();
                });
        } else {
            return this.mediaserverConnections[serverId].activateLicense(key).toPromise();
        }
    }

    renameServer(serverId: string, serverName: string) {
        const cleanServerId = serverId.replace(/[{}]/g, '');
        return this.mediaserverConnections[serverId].saveServerUserSettings(cleanServerId, { serverName });
    }

    restartServer(serverId: string) {
        return this.mediaserverConnections[serverId].restartServer()
            .catch(err => Promise.reject(err));
    }

    detachFromSystem(serverId: string, currentPassword: string) {
        return this.mediaserverConnections[serverId].detachFromSystem(currentPassword);
    }

    removeMediaserver(anotherServerId: string, serverIdToRemove: string) {
        return this.mediaserverConnections[anotherServerId].removeResource(serverIdToRemove);
    }

    restoreFactorySettings(serverId: string, currentPassword: string) {
        return this.mediaserverConnections[serverId].restoreFactorySettings(currentPassword);
    }

    /**
     * Storage endpoints
     */
    rebuildArchive(serverId: string, type: number, action?: string) {
        return this.mediaserverConnections[serverId].rebuildArchive(type, action);
    }

    checkForAnalyticsData(serverId: string) {
        return this.mediaserverConnections[serverId].checkForAnalyticsData();
    }

    getApiDoc(serverId: string) {
        return this.mediaserverConnections[serverId].getApiDoc();
    }

    getStorages(serverId, useCache = false) {
        return this.mediaserverConnections[serverId].getStorages(useCache);
    }

    getRecordStats(serverId, useCache = false) {
        return this.mediaserverConnections[serverId].getRecordStats(useCache);
    }

    getServerStats(serverId, useCache = false) {
        return this.mediaserverConnections[serverId].getServerStats(useCache);
    }
}

@Injectable()
export class NxSystem extends System implements OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    private userManager: UserManager;
    private serverManager: ServerManager;
    private _subscribersCount = new BehaviorSubject<number>(0);

    activeSubscription: Subscription;
    show404 = false;
    currentUserEmail: string;
    mediaserver: NxSystemAPI;
    currentServerNotBusy: boolean;
    currentBusyServerIds = new Set();

    infoPromise: Promise<Partial<NxSystemWithUserInfo>>;
    usersPromise: Promise<void>;
    systemPoll: Subscription | Observable<string | NxSystem>;
    licensesModifiedSubject = new BehaviorSubject<string>('');
    connectionSubject = new BehaviorSubject<boolean>(false);
    infoSubject = new BehaviorSubject<NxSystem>(undefined);

    get subscriberCount() {
        return this._subscribersCount.getValue();
    }

    set subscriberCount(count) {
        this._subscribersCount.next(count);
    }

    get isAvailable() {
        return this._isAvailable;
    }

    set isAvailable(value) {
        this._isAvailable = value;
        this.updateSystemState();
    }

    get lostConnection() {
        return this.connectionSubject.getValue();
    }

    set lostConnection(value) {
        this.connectionSubject.next(value);
    }

    get licensesModified() {
        return this.licensesModifiedSubject.getValue();
    }

    set licensesModified(value) {
        this.licensesModifiedSubject.next(value);
    }

    get systemInfo() {
        return this.infoSubject.getValue();
    }

    set systemInfo(system: NxSystem) {
        this.infoSubject.next(system);
    }

    // Start of userManger functions
    get accessRole() {
        return this.userManager.accessRole || '';
    }

    get accessRoles() {
        return this.userManager.accessRoles;
    }

    get currentUser() {
        return this.userManager.currentUser;
    }

    get isAdmin() {
        return this.userManager.permissions.isAdmin;
    }

    get isOwner() {
        return this.userManager.isOwner(this.userManager.currentUser);
    }

    get isMine() {
        return this.userManager.isMine;
    }

    get permissions() {
        return this.userManager.permissions;
    }

    get users() {
        return this.userManager.users;
    }

    get cameras() {
        return this.serverManager.cameras;
    }

    set cameras(newCameras: ICamera[]) {
        this.serverManager.cameras = newCameras;
    }

    /**
     * TODO: Need to update this method once better license information is available from server with details on license types.
     */
    getLicenseChannels(): Promise<{total: number, used: number, available: number}> {
        return this.serverManager.getLicenses().then(({ licenses, hwids }: any) => {
            const parsedLicenses = licenses.map(this.parseLicense);
            const total: number = parsedLicenses.reduce((qty, { COUNT, EXPIRATION, CLASS, HWID }) => {
                const activeLicense = hwids.includes(HWID) && !EXPIRATION || new Date(EXPIRATION).getTime() > Date.now();
                return activeLicense && (CLASS === 'digital' || CLASS === 'starter' || CLASS === 'edge') ? qty + parseInt(COUNT) : qty;
            }, 0);
            const used = this.cameras.filter(({ scheduleEnabled }) => scheduleEnabled).length;
            const available = total - used;
            return { total, used, available };
        });
    }

    parseLicense({ key, licenseBlock }: { key: string, licenseBlock: string }) {
        const parsedBlock: any = licenseBlock.split('\n').reduce((parsed, current) => {
            const [curKey, curVal] = current.split('=');
            return { ...parsed, [curKey]: curVal };
        }, {});
        return { key, ...parsedBlock };
    }

    // End of userManager get functions

    // Start of serverManager functions
    // @ts-ignore
    get servers() {
        return this.serverManager.servers;
    }

    get moduleInfo() {
        return this.serverManager.moduleInfo;
    }

    // End of serverManager functions

    constructor(
        CONFIG: IConfig,
        LANG: LanguageI18NStaticTypes,
        private cloudApi: NxCloudApiService,
        private systemApiService: NxSystemAPIService,
        private pollService: NxPollService,
        private systemsService: NxSystemsService,
        private ribbonService: NxRibbonService,
        currentUserEmail: string,
        systemId?: string,
        serverId?: string,
        userId?: string,
        private appState?: NxAppStateService,
    ) {
        super();

        this.CONFIG = CONFIG;
        this.LANG = LANG;
        this.lostConnection = false;
        this.initSystem(currentUserEmail, systemId, serverId, userId);
    }

    private updateSystemState() {
        this.stateMessage = '';
        if (!this.isAvailable) {
            this.stateMessage = this.LANG.system.status.unavailable?.();
        }
        if (!this.isOnline) {
            this.stateMessage = this.LANG.system.status.offline?.();
        }
    }

    ngOnDestroy() {
        if (this.systemPoll instanceof Subscription) {
            this.systemPoll.unsubscribe();
        }
    }

    initSystem(currentUserEmail: string, systemId?: string, serverId?: string, userId?: string) {
        this.id = systemId || serverId;
        this.isAvailable = false;
        this.isOnline = false;
        this.currentServerNotBusy = true;
        this.info = { name: '' };
        this.mergeInfo = {};
        this.cloudStorageSystemEnabled = false;

        this.currentUserEmail = currentUserEmail;
        this.mediaserver = this.systemApiService.createConnection(currentUserEmail, systemId, serverId, () => {
            /* Unauthorised request handler
             Some options here:
             - Access was revoked
             - System was disconnected from cloud\Password was changed
             - Nonce expired
             We try to update nonce and auth on the server again
             Other cases are not distinguishable
             */
            return this.updateSystemAuth(true);
        });
        // Handling promise to satisfy the linter.
        this.updateSystemAuth(true).then(() => {
        });

        this.userManager = new UserManager(this.CONFIG, this.LANG, this.mediaserver, currentUserEmail, userId);
        this.systemPoll = this.pollService.createPoll<any>(this.update, this.CONFIG.updateInterval);
        this.serverManager = new ServerManager(
            this.mediaserver,
            this.systemApiService,
            this.currentUserEmail,
            this.id,
            this.cloudApi
        );
    }

    getServerApiDoc(serverId: string) {
        return this.serverManager
            .getApiDoc(serverId).toPromise()
            .catch(err => Promise.reject(err));
    };

    updateSystemAuth(force?: boolean) {
        if (this.CONFIG.isLocal || !force && this.mediaserver.authGet) { // no need to update
            return Promise.resolve(true);
        }

        return this.cloudApi.getSystemAuth(this.id).toPromise().then((authKeys: any) => {
            this.mediaserver.setAuthKeys(authKeys.authGet, authKeys.authPost, authKeys.authPlay);
            return Promise.resolve(true);
        }).catch(() => {
            this.lostConnection = true;
        });
    }

    canViewInfo() {
        return (this.info.capabilities &&
            this.info.capabilities.vms_metrics) &&
            this.CONFIG.accessRoles.adminAccess.includes(this.accessRole.toLowerCase());
    }

    canUserViewCloudStorage() {
        if (this.CONFIG.isLocal) {
            return false;
        }
        return (this.CONFIG.cloudCapabilities.cloudStorageEnabled && this.isMine) ||
            (this.isAdmin && this.systemInfo.cloudStorageSystemEnabled) ||
            (this.systemInfo.cloudStorageCapable && this.isMine);
    }

    getInfoAndPermissions(useCache = true, suppressUpdate = false) {
        const parseSettings = ({
            cloudAccountName: ownerAccountEmail,
            systemName,
            specificFeatures,
            mergeInfo
        }: SystemConfigSettings) => {
            return {
                ownerAccountEmail,
                systemName,
                mergeInfo,
                capabilities : JSON.parse(<any> specificFeatures),
                isOnline     : true
            };
        };

        if (this.CONFIG.isLocal) {
            return this.mediaserver.getSystemSettings()
                .then(res => {
                    const parsedSettings = parseSettings(res);
                    Object.assign(parsedSettings, this.userManager.currentUser);
                    if (this.info) {
                        Object.assign(this.info, parsedSettings); // Update
                    } else {
                        this.info = parsedSettings;
                    }
                    this.id = res.localSystemId;
                    this.mergeInfo = this.info.mergeInfo;
                    this.isOnline = true;
                    this.cloudStorageCapable = false;

                    this.getUsers(true)
                        .then(() => {
                            this.userManager.ownerEmail = this.info.ownerAccountEmail;
                            this.userManager.accessRole = this.info.accessRole;
                            this.userManager.checkPermissions();
                        });
                })
                .catch(err => console.error('getInfoAndPermissions: ', err))
                .finally(() => {
                    return Promise.resolve(this as Partial<NxSystemWithUserInfo>);
                });
        }

        return this.systemsService
            .getSystemAsPromise(this.id, useCache)
            .then(async(response: any) => {
                const error = this.cloudApi.checkResponseHasError(response);
                if (error) {
                    return Promise.reject(error);
                }

                if (!response) {
                    // eslint-disable-next-line prefer-promise-reject-errors
                    return Promise.reject({ data: { resultCode: 'forbidden' } });
                }
                if (this.info) {
                    Object.assign(this.info, response); // Update
                } else {
                    this.info = response;
                }
                this.userManager.ownerEmail = this.info.ownerAccountEmail;
                this.isOnline = this.info.stateOfHealth === this.CONFIG.system.status.online;
                this.canMerge = this.userManager.isMine && (this.info.capabilities && this.info.capabilities.cloudMerge);
                this.cloudStorageCapable = this.info.capabilities && !!this.info.capabilities.cloudStorage;
                if (this.cloudStorageCapable) {
                    this.cloudStorageSystemEnabled = await this.cloudApi.getCloudStorageUsage(this.info.id).then(() => true, () => false);
                }
                this.mergeInfo = response.mergeInfo;

                if (!suppressUpdate) {
                    this.systemInfo = this;
                }
                if (!this.userManager.accessRole) {
                    this.userManager.accessRole = this.info.accessRole;
                }
                return Promise.resolve(this as Partial<NxSystemWithUserInfo>);
            });
    }

    getInfo(force?, useCache = true, suppressUpdate = false): Promise<Partial<NxSystemWithUserInfo|any>> {
        if (force) {
            this.infoPromise = undefined;
        }
        if (!this.infoPromise) {
            this.infoPromise = this.updateSystemAuth().then(() => {
                return this.getInfoAndPermissions(useCache, suppressUpdate).then((res) => {
                    return res;
                });
            });
        }
        return this.infoPromise;
    }

    getUsersCachedInCloud(): Promise<NxSystemUser[]> {
        this.isAvailable = false;
        return this.cloudApi.users(this.id).toPromise().then((data: any) => {
            if (data && data.resultCode === 'forbidden') {
                return Promise.reject(data);
            }
            data.forEach((user) => {
                user.isCloud = true;
                user.permissions = this.userManager.normalizePermissionString(user.customPermissions);
                user.email = user.accountEmail;
            });
            return data;
        }).catch(err => err);
    }

    getUsersDataFromTheSystem() {
        return this.userManager.getUsersDataFromTheSystem();
    }

    getUsers(reload?): Promise<void> {
        if (!this.usersPromise || reload) {
            let usersPromise: Promise<any>;
            if (this.isOnline) { // Two separate cases - either we get info from the system (presuming it has actual names)
                usersPromise = this.userManager.getUsersDataFromTheSystem().then(() => {
                    this.isAvailable = true;
                }).catch(() => {
                    if (this.isAdmin) {
                        return this.getUsersCachedInCloud().then((users) => {
                            this.userManager.processUsers(users);
                            return Promise.resolve();
                        });
                    } else {
                        return Promise.resolve();
                    }
                });
            } else if (this.isAdmin) { // or we get old cached data from the cloud
                usersPromise = this.getUsersCachedInCloud().then((users) => {
                    return this.userManager.processUsers(users);
                });
            } else {
                this.isAvailable = false;
                usersPromise = Promise.resolve();
            }

            this.usersPromise = usersPromise.then(() => {
                this.userManager.checkPermissions();
                // If system is reported to be online - try to get actual users list
                this.systemInfo = this;
            }); // Handling promise to satisfy the linter.
        }
        return this.usersPromise;
    }

    saveUser(user: NxSystemUser, role: NxSystemRole) {
        return this.userManager.saveUser(user, role);
    }

    deleteUser(removedUser: NxSystemUser) {
        return this.userManager.deleteUser(removedUser);
    }

    deleteFromCurrentAccount() {
        if (this.isAvailable && this.currentUser && !this.currentUser.isAdmin) {
            // Try to remove me from the system directly
            this.userManager.deleteUser(this.currentUser);
        }
        // Anyway - send another request to cloud_db to remove my this
        return this.cloudApi.unshare(this.id, this.currentUserEmail);
    }

    startPoll() {
        if (this.subscriberCount === 0) {
            if (this.CONFIG.isLocal || this.mediaserver.authGet) {
                this.subscriberCount++;
                this.activeSubscription = this.systemPoll instanceof Observable && this.systemPoll.subscribe(() => {});
            } else {
                setTimeout(() => this.startPoll(), 1000);
            }
        } else {
            this.subscriberCount++;
        }
    }

    stopPoll() {
        if (this.subscriberCount > 1) {
            this.subscriberCount--;
        } else {
            if (this.systemPoll instanceof Subscription) {
                this.systemPoll.unsubscribe();
            }
            if (this.activeSubscription instanceof Subscription) {
                this.activeSubscription.unsubscribe();
            }

            this.infoPromise = undefined;
            this.usersPromise = undefined;
            this.systemInfo = undefined;
            this.subscriberCount--;
        }
    }

    update = (): Promise<any> => {
        this.ribbonService.hide();
        return of('').pipe(flatMap(() => {
            return this.getInfo(true, false)
                .then(() => this.isOnline ? this.updateSystemServersCameras() : Promise.reject())
                .then(() => this.getUsers(true))
                .then(() => this.getServers().toPromise())
                .then(() => this.getCameras())
                .then(() => from(this.getUsers(true)))
                .then(() => this.filterCamerasFromUserPermissions())
                .catch((error) => {
                    this.ribbonService.show(this.LANG.ribbon.systemOffline?.(), [], 'alert');
                    this.isAvailable = false;
                    this.lostConnection = error?.data && error.data.resultCode === 'forbidden';
                });
        })).toPromise();
    }

    updateSystemServersCameras() {
        return this.serverManager.updateSystemServersCameras();
    }

    filterCamerasFromUserPermissions() {
        const accessRights: { [resourceId: string]: true } = this.currentUser.accessRights;
        if (accessRights && this.cameras) {
            this.cameras = this.cameras.filter(camera => accessRights[camera.id]);
        }
    }

    updateOrGetSystemSettings(updateParams = {}) {
        return this.mediaserver.updateOrGetSettings(updateParams);
    }

    getStorageStatus(queryParams) {
        return this.mediaserver.getStorageStatus(queryParams);
    }

    saveStorage<T>(updateParams?: T) {
        const typeId = '{f8544a40-880e-9442-b78a-9da6db6862b4}';
        return this.mediaserver.saveStorage({ ...updateParams, typeId });
    }

    removeStorage<T>(updateParams?: T) {
        return this.mediaserver.removeStorage(updateParams);
    }

    getServerStats(serverId, useCache = false) {
        return this.serverManager.getServerStats(serverId, useCache);
    }

    getRecordStats(serverId, useCache = false) {
        return this.serverManager.getRecordStats(serverId, useCache);
    }

    getStorages<T>(queryParams?: T) {
        return this.mediaserver.getStoragesInfo(queryParams);
    }

    updateOrGetSystemStorage<T extends any>(updateParams?: any, useCache = false) {
        if (!updateParams?.serverId) {
            return this.mediaserver.updateStorages(updateParams);
        }
        return this.serverManager.getStorages(updateParams.serverId, useCache);
    }

    checkForAnalyticsData(serverId: string) {
        return this.serverManager.checkForAnalyticsData(serverId);
    }

    initSystemMediaServers() {
        return this.serverManager.initSystemMediaServers();
    }

    getPreviewUrl(cameraId: string, time: number, width = 640, height = 480, rotate = 0) {
        return this.serverManager.getPreviewUrl(cameraId, time, width, height, rotate);
    }

    getCameras() {
        return this.serverManager.getCameras();
    }

    updateCameraSettings(id: string, params: IParams) {
        return this.serverManager.updateSettings(id, params);
    }

    setCameraUserSettings(serverId: string, id: string, params: { [key: string]: string }) {
        return this.serverManager.setCameraUserSettings(serverId, id, params);
    }

    updateRecordingSettings(updatedTask: Pick<ITask, 'fps' | 'recordingType' | 'streamQuality'> | false, cameraSettings: Pick<ICamera, 'id' | 'name' | 'audioEnabled' | 'scheduleEnabled' | 'overrideAr' | 'rotation'>) {
        return this.serverManager.updateRecordingSettings(updatedTask, cameraSettings);
    }

    setServerUserSettings(id: string, params: { [key: string]: string }) {
        return this.serverManager.setServerUserSettings(id, params);
    }

    updateOrGetBackupControl(serverId: string, action?: 'start' | 'stop') {
        return this.serverManager.updateOrGetBackupControl(serverId, action);
    }

    getServers() {
        return this.serverManager.getServers();
    }

    getForceServers() {
        return this.serverManager.getForceServers(false);
    }

    getModuleInfo(serverId?: string) {
        return this.serverManager.getModuleInfo(serverId);
    }

    changeServerPort(port: number, serverId: string) {
        return this.serverManager.changeServerPort(port, serverId);
    }

    renameServer(serverId: string, serverName: string) {
        return this.serverManager.renameServer(serverId, serverName)
            .then(() => this.update())
            .catch(err => Promise.reject(err));
    }

    restartServer(serverId: string) {
        this.currentServerNotBusy = false;
        return this.serverManager.restartServer(serverId)
            .catch(err => Promise.reject(err));
    }

    updateServerSettings(serverId: string, params: IParams) {
        return this.serverManager.updateSettings(serverId, params);
    }

    detachFromSystem(serverId: string, currentPassword: string) {
        this.currentServerNotBusy = false;
        return this.serverManager.detachFromSystem(serverId, currentPassword);
    }

    removeMediaserver(anotherServerId: string, currentServerId: string) {
        return this.serverManager.removeMediaserver(anotherServerId, currentServerId);
    }

    restoreFactorySettings(serverId: string, currentPassword: string) {
        this.currentServerNotBusy = false;
        return this.serverManager.restoreFactorySettings(serverId, currentPassword);
    }

    mergeSystems(url: string, dryRun: string, currentPassword?: string) {
        return this.mediaserver.mergeSystems(url, dryRun, currentPassword);
    }

    checkMergeStatus(forceReload = true) {
        return this.mediaserver.checkMergeStatus(forceReload);
    }

    getPeerSystems() {
        return this.mediaserver.getPeerSystems();
    }

    logLevel(serverId: string) {
        return this.serverManager.logLevel(serverId);
    }

    setLogLevels(serverId: string, loggers: IParams) {
        return this.serverManager.setLogLevels(serverId, loggers);
    }

    getHardwareIdsOfServers() {
        return this.mediaserver
            .getHardwareIdsOfServers()
            .toPromise();
    }

    getLicenses() {
        return this.mediaserver
            .getLicenses()
            .toPromise();
    }

    activateLicense(serverId, key) {
        return this.serverManager.activateLicense(serverId, key);
    }

    // <added by @gbezyuk to fix auth race condition>
    authPromise: Promise<any>
    // </added by @gbezyuk to fix auth race condition>

    // <changed by @gbezyuk to fix auth race condition>
    ensureSystemAuth(force?) {
        if (this.CONFIG.isLocal) return Promise.resolve()

        // console.log('ensureSystemAuth', this.id)
        if (this.authPromise) {
            // console.log('in progress')
            return this.authPromise;
        }

        // NOTE@gbezyuk: bad direct dependency
        if (!force && this.mediaserver.authGet) { // no need to update
            // console.log('no need', this.mediaserver.authGet)
            return Promise.resolve(true);
        }

        this.authPromise = this.cloudApi.getSystemAuth(this.id).toPromise().then((authKeys: any) => {
            if (authKeys.authGet) {
                this.mediaserver.setAuthKeys(authKeys.authGet, authKeys.authPost, authKeys.authPlay);
                // console.log('new ones are good')
                this.authPromise = null;
                return Promise.resolve(true);
            } else {
                // console.error('bad system auth response', authKeys)
                this.authPromise = null;
                return Promise.reject(authKeys);
            }
        });
        return this.authPromise;
    }
    // </changed by @gbezyuk to fix auth race condition>

    // <added by @gbezyuk for watch component>

    public getResourceTypes(force: boolean = false) {
        // console.log('getting resource types')
        if (this.resourceTypes && !force) {
            // console.log('there are resource types in cache')
            return Promise.resolve(this.resourceTypes);
        }
        // TODO: cache invalidation (@gbezyuk)
        // console.log('resource type cache is empty, sending a query')
        return this.ensureSystemAuth().then(
            () => this.mediaserver.getResourceTypes().toPromise()
        ).then(resource_types => {
            this.resourceTypes = resource_types;
            return this.resourceTypes;
        });
    }

    public getMediaServersAndCameras(force:boolean = false) {
        // console.log('getMediaServersAndCameras enter')
        if (this.mediaservers && !force) {
            // console.log('using cached mediaservers');
            return Promise.resolve(this.mediaservers);
        }

        // return this.mediaserver.getMediaServersAndCameras().toPromise().then( // simpler version, for debug
        return this.ensureSystemAuth().then(
            () => this.mediaserver.getMediaServersAndCameras().toPromise()
        ).then(

            // @ts-ignore
            response => {
                // console.log('GMSAC', response)
                // CURSING@gbezyuk: error code as a string in JSON, guys, really?
                // @ts-ignore
                if ((response.error && response.error !== '0') || !response.reply) {
                    console.error('error getting mediaservers and cameras');
                    return response;
                }
                // @ts-ignore
                return this._setMediaServersAndCameras(response.reply);
            }
        ).catch(
            response => {
                console.error('getMediaServersAndCameras failure', response);
            }
        );
        // TODO: better error handling
    }

    protected _setMediaServersAndCameras(api_reply) {
        // `mss` stands for mediaservers, `cs` — for cameras
        const mss = api_reply['ec2/getMediaServersEx'] || api_reply['/ec2/getMediaServersEx']; // sometimes the server sends weird keys (@gbezyuk)
        let cs = api_reply['ec2/getCamerasEx'];

        return this.getResourceTypes().then(resource_types => {
            // console.log('filtering, resource types that we got are', resourceTypes)
            const desktop_camera_type =
                resource_types.find(t => t.name === 'SERVER_DESKTOP_CAMERA');

            console.log('desktop_camera_type', desktop_camera_type);

            cs = cs.filter(
                c =>
                    c.typeId !== desktop_camera_type.id &&
                    !c.addParams.find(p => p.name === 'ioConfigCapability')
            ).map(trim_ids);
            // TODO: map camera data preprocessing here
            // (strip IDs, parse JSON, provide (and maybe check) URLs, etc.)
            console.log('cameras filtered', cs);

            // TODO: preprocess servers, too
            // (strip IDs, parse JSON, etc.)
            this.mediaservers = mss.map(trim_ids).map(ms => ({
                ...ms,
                // keeping cameras inside/under the mediaserver they belong to
                // cameras: cs.filter(c => c.preferredServerId === ms.id)
                cameras: cs.filter(c => c.parentId === ms.id)
            }));
            console.log('mediaservers filtered', this.mediaservers);
            return this.mediaservers;
        });
    }

    public checkCameraThumbnail(cameraId) {
        // TODO: maybe check if this camera_id belongs to us (@gbezyuk)
        return this.ensureSystemAuth().then(
            () => this.mediaserver.checkCameraThumbnail(cameraId)
        );
    }

    public getCameraThumbnailUrl(cameraId, width = 68, height = 38) {
        return this.mediaserver.getCameraThumbnailUrl(cameraId, width, height);
    }

    public getCameraLiveHlsUrl(cameraId) {
        return this.ensureSystemAuth().then(
            () => this.mediaserver.getLiveHlsUrl(cameraId)
        );
    }

    public getHlsUrl(cameraId, position?, resolution = 'hi') {
        return this.ensureSystemAuth().then(
            () => position === -1
                ? this.mediaserver.getLiveHlsUrl(cameraId, resolution)
                : this.mediaserver.getHlsUrl(cameraId, position, resolution)
        );
    }

    public unsafeGetCameraLiveHlsUrl(cameraId, resolution = 'hi') {
        return this.mediaserver.getLiveHlsUrl(cameraId, resolution);
    }

    public unsafeGetHlsUrl(cameraId, position?, resolution = 'hi') {
        return position === -1
            ? this.mediaserver.getLiveHlsUrl(cameraId, resolution)
            : this.mediaserver.getHlsUrl(cameraId, position, resolution);
    }

    public getCameraRecords(cameraId, startTime?, endTime?, detail?, limit?, label?, periodsType?) {
        // TODO: maybe check if this camera_id belongs to us (@gbezyuk)
        return this.ensureSystemAuth().then(
            () => this.mediaserver.getRecords(
                cameraId, startTime, endTime, detail, limit, label, periodsType
            ).toPromise()
        );
    }

    public getServerTimes(): Promise<Array<ServerTimeInfo>> {
        return this.ensureSystemAuth().then(
            () => this.mediaserver.getServerTimes().toPromise().then(
                r => {
                    const now = Date.now();
                    // @ts-ignore
                    return r.reply.map(i => ({
                        vmsTimeOffset  : now - parseInt(i.vmsTime),
                        osTimeOffset   : now - parseInt(i.osTime),
                        serverId       : i.serverId.slice(1, i.serverId.length - 1),
                        timeZoneOffset : parseInt(i.timeZoneOffset)
                    }));
                }
            )
        );
    }
    // </added by @gbezyuk for watch component>

    /**
     * Storage server endpoints
     */
    rebuildArchive(serverId: string, type: number, action?: string) {
        return this.serverManager.rebuildArchive(serverId, type, action);
    }
}

@Injectable({
    providedIn: 'root'
})
export class NxSystemService {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    private system: NxSystem;
    private systemsCache: { [systemId: string]: NxSystem };

    constructor(
        configService: NxConfigService,
        private languageService: NxLanguageProviderService,
        private cloudApi: NxCloudApiService,
        private systemApiService: NxSystemAPIService,
        private pollService: NxPollService,
        private systemsService: NxSystemsService,
        private appState: NxAppStateService,
        private ribbonService: NxRibbonService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.languageService.translations;
        this.systemsCache = {};
    }

    createSystem(currentUserEmail: string, systemId: string, serverId?: string, skipPoll?: boolean) {
        let system: NxSystem;
        const id = systemId || serverId;
        if (id in this.systemsCache) {
            system = this.systemsCache[id];
        } else {
            system = new NxSystem(
                this.CONFIG, this.LANG,
                this.cloudApi, this.systemApiService,
                this.pollService, this.systemsService,
                this.ribbonService, currentUserEmail,
                systemId, serverId
            );
            this.systemsCache[id] = system;
        }
        system.lostConnection = false;
        if (!skipPoll) {
            system.startPoll();
        }
        return system;
    }

    createLocalSystem(mediaServer: NxSystemAPI, userId: string, userEmail = '') {
        if (this.system !== undefined) {
            return this.system;
        }
        this.system = new NxSystem(
            this.CONFIG, this.LANG,
            this.cloudApi, this.systemApiService,
            this.pollService, this.systemsService,
            this.ribbonService, userEmail, '', '',
            userId, this.appState);
        this.system.mediaserver = mediaServer;
        this.system.canMerge = true;
        this.system.update();
        this.system.startPoll();
        if (!this.systemsService.systems) {
            this.systemsService.systems = [<any> this.system];
        }
        return this.system;
    }
}

export interface IAddParamsRaw {
    name: string;
    value: string;
}

export interface ICamera {
    addParams: IAddParamsRaw[];
    parsedAddParams: IParsedAddParams;
    rotation?: number | string;
    overrideAr?: number | string;
    isAudioSupported: boolean;
    audioEnabled: boolean;
    backupType: string;
    controlEnabled: boolean;
    dewarpingParams: string;
    disableDualStreaming: boolean;
    failoverPriority: string;
    groupId: string;
    groupName: string;
    id: string;
    licenseUsed: boolean;
    motionLowresEnabled: boolean;
    logicalId: string;
    mac: string;
    manuallyAdded: boolean;
    maxArchiveDays: number;
    minArchiveDays: number;
    model: string;
    motionMask: string;
    motionType: MotionType;
    motionEnabled: boolean | string;
    maxFps: number;
    mediaCapabilities: IMediaCapabilities;
    name: string;
    parentId: string;
    parentName: string;
    physicalId: string;
    preferredServerId: string;
    recordAfterMotionSec: number;
    recordBeforeMotionSec: number;
    scheduleEnabled: boolean;
    scheduleTasks: ITask[];
    status: string;
    statusFlags: string;
    typeId: string;
    url: string;
    userDefinedGroupName: string;
    vendor: string;
    previewUrl: string;
    recordingSettings: IRecordingSettings;
    isStream: boolean,
}

export enum MotionType {
    hardwareGrid = '1',
    softwareGrid = '2',
    motionWindow = '4',
    noMotion = '8'
}

export interface IMediaCapabilities {
    hasAudio: boolean;
    streamCapabilities: any
}

export interface ITask {
    bitrateKbps: number;
    dayOfWeek: number;
    endTime: number;
    fps: number;
    recordingType: RecordingType;
    startTime: number;
    streamQuality: StreamQuality
}

export interface IRecordingSettings {
    recording: boolean;
    quality: StreamQuality;
    fps: number | 'various' | any;
    motionEnabled: boolean;
    modes: IRecordingModes[];
}

export interface IRecordingModes {
    name: string;
    id: RecordingType;
    value: 0 | 1 | 2; // 0: None scheduled, 1: Some scheduled, 2: All scheduled
    enabled: boolean;
}

export type RecordingType = 'RT_Always' | 'RT_MotionOnly' | 'RT_MotionAndLowQuality' | 'RT_Never'
export type StreamQuality = 'low' | 'normal' | 'high' | 'highest' | 'various'

export interface Condition {
    paramId: string;
    type: string;
    value: string;
}

export interface Dependency {
    conditions: Condition[];
    id: string;
    internalRange: string;
    range: string;
    type: string;
    valuesToAddToRange: any[];
    valuesToRemoveFromRange: any[];
}

export interface Param {
    aux: string;
    availableInOffline: boolean;
    bindDefaultToMinimum: boolean;
    compact: boolean;
    confirmation: string;
    dataType: string;
    dependencies: Dependency[];
    description: string;
    group: string;
    id: string;
    internalRange: string;
    keepInitialValue: boolean;
    name: string;
    notes: string;
    range: string;
    readCmd: string;
    readOnly: boolean;
    resync: boolean;
    showRange: boolean;
    tag: string;
    unit: string;
    writeCmd: string;
}

export interface Group2 {
    aux: string;
    description: string;
    groups: any[];
    name: string;
    params: Param[];
}

export interface Group {
    aux: string;
    description: string;
    groups: Group2[];
    name: string;
    params: any[];
}

export interface CameraAdvancedParams {
    groups: Group[];
    name: string;
    // eslint-disable-next-line camelcase
    packet_mode: boolean;
    // eslint-disable-next-line camelcase
    unique_id: string;
    version: string;
}

export interface IoSetting {
    autoResetTimeoutMs: number;
    iDefaultState: string;
    id: number;
    inputName: string;
    oDefaultState: string;
    outputName: string;
    portType: string;
    supportedPortTypes: string;
}

export interface CustomStreamParams {
}

export interface Stream {
    codec: number;
    customStreamParams: CustomStreamParams;
    encoderIndex: number;
    resolution: string;
    transcodingRequired: boolean;
    transports: string[];
}

export interface MediaStreams {
    streams: Stream[];
}

export interface StreamUrls {
    1?: string;
    2?: string;
}

export interface BitrateInfoStreams {
    actualBitrate: number;
    actualFps: number;
    averageGopSize: number;
    bitrateFactor: number;
    bitratePerGop: boolean;
    encoderIndex: string;
    fps: number;
    isConfigured: boolean;
    numberOfChannels: number;
    rawSuggestedBitrate: number;
    resolution: string;
    suggestedBitrate: number;
    timestamp: Date;
}

export interface BitrateInfos {
    streams: BitrateInfoStreams[];
}

interface _ParsedAddParams {
    DeviceUrl: string;
    VideoLayout: string;
    cameraCapabilities: number;
    compatibleAnalyticsEngines: any[];
    credentials: string;
    driverClass: string;
    firmware: string;
    hasDualStreaming: number;
    ioSettings: IoSetting[];
    mediaStreams: MediaStreams;
    ptzCapabilities: number;
    streamUrls: StreamUrls;
    bitrateInfos: BitrateInfos;
    bitratePerGOP: number;
    dontRecordPrimaryStream: number;
    dontRecordSecondaryStream: number;
    mediaPort: string;
    rtpTransport: string;
    trustCameraTime: number;
    userEnabledAnalyticsEngines: any[];
    motionStream: string;
    streamFpsSharing: string;
    supportedMotion: string;
    defaultPreferredPtzPresetType: string;
}

export type IParsedAddParams = Partial<_ParsedAddParams>
