import { Component, Inject, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { AngularFireMessaging } from '@angular/fire/messaging';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { timer } from 'rxjs/observable/timer';

@Component({
    selector: 'push-notifications-component',
    templateUrl: 'push-notifications.component.html',
    styleUrls: ['push-notifications.component.scss']
})

export class PushComponent implements OnInit {
    private notification: any;
    private systems: any;
    private devices: any;
    private newDevice: any;
    private deviceSubscriptions: any;
    private deviceToken: any;
    private registered: boolean;
    private sendStatus: string;
    private receivedMessages: any;
    location: Location;

    private setupDefaults() {
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
            success: false
        };
        this.registered = undefined;
        this.devices = [];
        this.receivedMessages = [];
        this.deviceSubscriptions = {};
    }

    constructor(@Inject('account') private account: any,
                @Inject('system') private systemService: any,
                @Inject('systemsProvider') private systemsProvider: any,
                @Inject('authorizationCheckService') private authorizationService: any,
                private afMessaging: AngularFireMessaging,
                private http: HttpClient,
                location: Location) {
        this.setupDefaults();
        this.location = location;
    }

    ngOnInit(): void {
        this.authorizationService.requireLogin().then(result => {
            if (!result) {
                this.location.go('404');
                return;
            } else {
                this.account.get().then(
                    (account) => {
                        if (account.email.endsWith('@networkoptix.com')) {
                            this.setSystems();
                            this.setFirebase();
                        } else {
                            this.authorizationService.redirectToHome();
                        }
                    });
            }
        });
    }

    setSystems() {
        timer(10000, 10000).subscribe(() => this.updateSubStates());
        this.systemsProvider.forceUpdateSystems().then(
            () => {
                this.systems = this.systemsProvider.systems;
                this.notification.system = '';
                this.updateSubStates();
            });
    }

    setFirebase() {
        this.afMessaging.tokenChanges.subscribe(
            (token) => {
                this.deviceToken = token;
                this.getRegistrationStatus();
            },
            (error) => {
                this.deviceToken = error;
            }
        );
        this.afMessaging.messages.subscribe(
            (message: any) => {
                this.receivedMessages.push(message);
                const _notify = new Notification(message.notification.title, ...message.notification);
                if (message.data) {
                    message.data = JSON.stringify(message.data);
                }
                this.updateSubStates();
            });
    }

    updateSubStates() {
        this.http.get('/notifications/subscriptions').subscribe(
            (response: any) => {
                this.devices = [];
                this.deviceSubscriptions = {};
                response.forEach((device) => {
                    this.devices.push(device);
                    this.deviceSubscriptions[device.deviceToken] = {};
                    device.subscriptions.forEach((subscription) => {
                        this.deviceSubscriptions[device.deviceToken][subscription.system_id] = subscription.active;
                    });
                });
            },
            error => {
                this.deviceSubscriptions = {};
            });
    }

    onAllowNotifications() {
        this.afMessaging.requestToken
            .subscribe(
                (token) => {
                    this.deviceToken = token;
                    this.updateSubStates();
                },
                (error) => {
                    this.deviceToken = '';
                },
            );
    }

    onRegisterDevice(form?) {
        let deviceToken = '';
        let name = '';
        let model = '';
        if (form === undefined) {
            deviceToken = this.deviceToken;
            name = 'Browser';
            model = window.navigator.userAgent;
        } else {
            deviceToken = this.newDevice.deviceToken;
            name = this.newDevice.name;
            model = this.newDevice.model ? this.newDevice.model : 'custom';
        }
        const headers = new HttpHeaders()
            .set('Content-Type', 'application/json');
        this.http.post('/notifications/register_device', {
            deviceToken, name, model
        }, {headers}).subscribe(
            () => {
                if (deviceToken === this.deviceToken) {
                    this.registered = true;
                }
                if (form) {
                    this.newDevice.success = true;
                    form.reset();
                }
                this.updateSubStates();
            },
            error => {
                this.newDevice.success = false;
                if (error.error.deviceToken && form) {
                    this.newDevice.deviceTokenError = error.error.deviceToken;
                    form.controls.newDeviceToken.setErrors({invalid: true});
                }
            });
    }

    getRegistrationStatus() {
        this.http.get('/notifications/register_device', {
            params: {
                deviceToken: this.deviceToken,
                name: 'Browser',
                model: window.navigator.userAgent
            },
        }).subscribe((response: any) => {
            this.registered = response.registered;
        });
    }

    onDeleteToken() {
        this.afMessaging.deleteToken(this.deviceToken).subscribe(
            () => {
                this.onAllowNotifications();
                this.registered = false;
            });
    }

    validateJsonInput(control) {
        if (control.value) {
            try {
                const val = JSON.parse(control.value);
                if (typeof val === 'object' && !Array.isArray(val)) {
                    return val;
                } else {
                    control.setErrors({incorrect: true});
                }
            } catch (error) {
                control.setErrors({incorrect: true});
            }
        } else {
            return '';
        }
    }

    onSendNotification(form) {
        const payload = this.validateJsonInput(form.controls.payload);
        const options = this.validateJsonInput(form.controls.options);
        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type': 'application/json',
            })
        };
        this.http.post('/notifications/push_notification', {
            systemId: this.notification.system,
            targets: [this.account.getEmail()],
            notification: {
                title: this.notification.title,
                body: this.notification.body,
                payload,
                options
            }
        }, httpOptions).subscribe(
            (response: any) => {
                this.sendStatus = 'Sent, Notification Id:' + response.notificationId;
            },
            (response: any) => {
                this.sendStatus = 'Error: ' + JSON.stringify(response.error);
            });
    }

    onToggleSubscribe(deviceToken, systemId) {
        const subState = this.deviceSubscriptions[deviceToken][systemId];
        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type': 'application/json',
            })
        };
        this.http.post('/notifications/subscribe', {
            systemId: systemId,
            deviceToken: deviceToken,
            isActive: subState
        }, httpOptions).subscribe(
            (response: any) => {},
            (error: any) => {
                this.updateSubStates();
            });
    }
}

