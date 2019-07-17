import { Component, Inject, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { AngularFireMessaging } from '@angular/fire/messaging';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
    selector: 'push-notifications-component',
    templateUrl: 'push-notifications.component.html'
})

export class PushComponent implements OnInit {
    private notification: any;
    private systems: any;
    private deviceToken: any;
    private registered: boolean;
    private sendStatus: string;
    private receivedMessages = [];
    location: Location;

    private setupDefaults() {
        this.notification = {
            title: '',
            body: '',
            payload: '',
            options: ''
        };
        this.registered = undefined;
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
                if (message.data) {
                    message.data = JSON.stringify(message.data);
                }
                this.receivedMessages.push(message);
                const _notify = new Notification(message.notification.title, {body: message.notification.body});
                this.updateSubStates();
            });
    }

    updateSubStates() {
        this.systems.forEach((system) => {
            this.http.get('/notifications/subscribe', {
                params: {
                    deviceToken: this.deviceToken,
                    systemId: system.id
                }
            }).subscribe((response: any) => {
                    system.subState = response.isActive;
                },
                error => {
                    system.subState = undefined;
                });
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

    onRegisterDevice() {
        const headers = new HttpHeaders()
            .set('Content-Type', 'application/json');
        this.http.post('/notifications/register_device', {
            deviceToken: this.deviceToken,
            name: 'Browser',
            model: window.navigator.userAgent
        }, {headers}).subscribe(() => {
            this.registered = true;
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

    onSendNotification() {
        let payload = '';
        let options = '';
        if (this.notification.payload) {
            payload = JSON.parse(this.notification.payload);
        }
        if (this.notification.options) {
            options = JSON.parse(this.notification.options);
        }
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

    onToggleSubscribe(system) {
        system.subState = system.subState !== undefined ? !system.subState : true;
        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type': 'application/json',
            })
        };
        this.http.post('/notifications/subscribe', {
            systemId: system.id,
            deviceToken: this.deviceToken,
            isActive: system.subState
        }, httpOptions).subscribe(
            (response: any) => {},
            (error: any) => {
                this.updateSubStates();
            });
    }
}

