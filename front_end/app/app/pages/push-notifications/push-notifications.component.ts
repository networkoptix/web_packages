import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFireMessaging } from '@angular/fire/compat/messaging';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Subscription, timer } from 'rxjs';

import { NxAccountService } from '@services/account.service';
import { isAccount } from '@services/account.service/account';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystemsService } from '@services/systems.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'push-notifications-component',
    templateUrl: 'push-notifications.component.html',
    styleUrls: ['push-notifications.component.scss']
})

export class PushComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;

    notification;
    systems;
    devices;
    newDevice;
    deviceSubscriptions;
    deviceToken;
    deviceName: string;
    currentDeviceName;
    permission: string;
    registered: boolean;
    sendStatus: string;
    receivedMessages;
    account: any;

    private subChanges: boolean;
    private tokenSubscription: Subscription;

    private setupDefaults(): void {
        this.notification = {
            title: '',
            body: '',
            payload: '',
            options: ''
        };
        this.newDevice = {
            deviceToken: '',
            deviceTokenError: '',
            name: '',
            model: '',
            provider: '',
            userId: '',
            success: false
        };
        this.registered = undefined;
        this.devices = [];
        this.receivedMessages = [];
        this.deviceSubscriptions = {};
        this.subChanges = false;
    }

    constructor(
        configService: NxConfigService,
        private accountService: NxAccountService,
        private systemsService: NxSystemsService,
        private afMessaging: AngularFireMessaging,
        private http: HttpClient,
        private router: Router
    ) {
        this.setupDefaults();
        this.CONFIG = configService.getConfig();
    }

    ngOnDestroy(): void {}

    ngOnInit(): void {
        this.accountService.requireLogin().then(account => {
            if (
                isAccount(account) &&
                account.email.endsWith('@networkoptix.com')
            ) {
                this.account = account;
                this.setSystems();
                this.setFirebase();
            } else {
                this.router.navigate([this.CONFIG.redirect.unauthorised]);
            }
        });
    }

    setSystems(): void {
        timer(10000, 10000).pipe(untilDestroyed(this)).subscribe(() =>
            this.updateSubStates()
        );
        this.systemsService.forceUpdateSystemsAsPromise().then(
            () => {
                this.systems = this.systemsService.systems;
                this.notification.system = '';
                this.updateSubStates();
            });
    }

    setFirebase(): void {
        this.permission = Notification.permission;
        if (this.permission === 'granted') {
            this.tokenSubscribe();
        } else {
            this.deviceToken = '';
            this.registered = false;
        }

        this.afMessaging.messages.subscribe(
            (message: any) => {
                if (!message.notification) {
                    message.notification = {};
                }
                message.notification.title = message.notification.title || ' ';
                message.notification.body = message.notification.body || '';
                this.receivedMessages.push(message);
                // eslint-disable-next-line no-new
                new Notification(message.notification.title, message.notification);
                if (message.data) {
                    message.data = JSON.stringify(message.data);
                }
                this.updateSubStates();
            });
    }

    writeSubscription(device, token): void {
        device.deviceToken = token;
        this.deviceSubscriptions[token] = {};
        this.deviceSubscriptions[token].all = device.systems.includes('all');
        this.systems.forEach(system => {
            this.deviceSubscriptions[token][system.id] =
                !!device.systems.includes(system.id);
        });
    }

    updateSubStates(): void {
        this.http.get('/api/notifications/subscriptions').subscribe(
            (response: any) => {
                if (!this.subChanges) {
                    this.devices = [];
                    this.deviceSubscriptions = {};
                    Object.entries(response).forEach(([token, device]: any) => {
                        if (token === this.deviceToken) {
                            this.registered = true;
                            this.deviceName = device.deviceInfo.name;
                        }
                        this.writeSubscription(device, token);
                        this.devices.push(device);
                    });
                    this.registered = !!this.registered;
                } else {
                    this.subChanges = false;
                    this.updateSubStates();
                }
            },
            () => {
                this.deviceSubscriptions = {};
            });
    }

    tokenSubscribe(): void {
        if (this.tokenSubscription && !this.tokenSubscription.closed) {
            this.tokenSubscription.unsubscribe();
        }
        this.tokenSubscription = this.afMessaging.tokenChanges
            .subscribe(
                token => {
                    this.deviceToken = token;
                    this.updateSubStates();
                },
                error => {
                    this.deviceToken = error;
                }
            );
    }

    onAllowNotifications(): void {
        Notification.requestPermission().then(permission => {
            this.permission = permission;
            if (permission === 'granted') {
                this.tokenSubscribe();
            }
        });
    }

    onRegisterDevice(form?): void {
        let deviceToken = '';
        const systems = [];
        const deviceInfo = {
            name: '',
            model: ''
        };
        const isEnabled = true;
        let provider;
        let userId;
        if (form === undefined) {
            deviceToken = this.deviceToken;
            deviceInfo.name = this.currentDeviceName
                ? this.currentDeviceName
                : 'Browser';
            deviceInfo.model = window.navigator.userAgent;
            provider = 'firebase';
        } else {
            deviceToken = this.newDevice.deviceToken;
            deviceInfo.name = this.newDevice.name;
            deviceInfo.model = this.newDevice.model
                ? this.newDevice.model
                : 'custom';
            provider = this.newDevice.provider;
            userId = this.newDevice.userId;
        }
        const headers = new HttpHeaders().set(
            'Content-Type',
            'application/json'
        );
        this.http.put(`/api/notifications/subscriptions/${deviceToken}`, {
            deviceInfo, isEnabled, systems, provider, userId
        }, { headers }).subscribe(
            () => {
                if (deviceToken === this.deviceToken) {
                    this.registered = true;
                }
                if (form) {
                    this.newDevice.success = true;
                    form.reset();
                    this.newDevice.provider = '';
                }
                this.updateSubStates();
            },
            error => {
                this.newDevice.success = false;
                if (error.error.deviceToken && form) {
                    this.newDevice.deviceTokenError = error.error.deviceToken;
                    form.controls.newDeviceToken.setErrors({ invalid: true });
                }
            });
    }

    onDeleteToken(): void {
        this.afMessaging.deleteToken(this.deviceToken).subscribe(
            () => {
                this.onAllowNotifications();
                this.registered = false;
                this.deviceName = '';
            });
    }

    validateJsonInput(control) {
        if (control.value) {
            try {
                const val = JSON.parse(control.value);
                if (typeof val === 'object' && !Array.isArray(val)) {
                    return val;
                } else {
                    control.setErrors({ incorrect: true });
                }
            } catch (error) {
                control.setErrors({ incorrect: true });
            }
        } else {
            return {};
        }
    }

    onSendNotification(form): void {
        const payload = this.validateJsonInput(form.controls.payload);
        const options = this.validateJsonInput(form.controls.options);
        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type': 'application/json'
            })
        };
        this.http.post('/api/notifications/push_notification', {
            systemId: this.notification.system,
            targets: [this.account.email],
            notification: {
                title: this.notification.title,
                body: this.notification.body,
                payload,
                options
            }
        }, httpOptions).subscribe(
            (response: any) => {
                this.sendStatus =
                    'Sent, Notification Id:' + response.notificationId;
            },
            (response: any) => {
                this.sendStatus = 'Error: ' + JSON.stringify(response.error);
            });
    }

    onToggleSubscribe(device, systemId): void {
        const deviceToken = device.deviceToken;
        const provider = device.provider;
        this.subChanges = true;
        const systems = [];
        if (systemId === 'all' && this.deviceSubscriptions[deviceToken].all) {
            systems.push('all');
        } else {
            Object.entries(this.deviceSubscriptions[deviceToken]).forEach(
                ([systemId, active]) => {
                    if (active && systemId !== 'all') {
                        systems.push(systemId);
                    }
                }
            );
        }
        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type': 'application/json'
            })
        };
        this.http.put(`/api/notifications/subscriptions/${deviceToken}`, {
            systems,
            provider
        }, httpOptions).subscribe(
            (response: any) => {
                this.writeSubscription(response, deviceToken);
            },
            () => {
                this.updateSubStates();
            });
    }
}
