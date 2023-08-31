import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { Component, NgZone, ViewChild } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { filter, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { EmailNotification } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemsService } from '@services/systems.service';
import { apiBase } from '@static-variables';

interface SystemDropdownItem extends DropdownItem<string> {
    state: string;
}

type TestEvent = Required<Omit<EmailNotification, 'targets' | 'systemId'>>;
type NotificationDropdownItem = DropdownItem<TestEvent>;

const getTestEvents = (systemId?: string): NotificationDropdownItem[] => [
    {
        name: 'Custom',
        value: { subject: '', messageHtml: '', messageText: '', attachments: [] },
    },
    {
        name: 'Camera Motion',
        value: {
            subject: 'Camera motion detected on camera 1',
            messageHtml: `<p>Motion Detected on camera 1 at ${new Date(
                Date.now(),
            ).toLocaleTimeString()} ${new Date(
                Date.now(),
            ).toLocaleDateString()}. See attached screenshot</p>`,
            messageText: `Motion Detected on camera 1 at ${new Date(
                Date.now(),
            ).toLocaleTimeString()} ${new Date(
                Date.now(),
            ).toLocaleDateString()}. See attached screenshot`,
            attachments: [
                {
                    filename: 'event.jpg',
                    content:
                        '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxISEBIQERAPDw8PDw8QEA8PDw8PDw8PFREWFhURFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OFxAQFysdFR0rLSstKy0rLS0rKysrLS0tKy0rKy0rLS0tLTcrKys3LS0rNy03KystKy0rKysrKysrK//AABEIALcBEwMBIgACEQEDEQH/xAAbAAACAwEBAQAAAAAAAAAAAAACAwABBAUGB//EADoQAAICAQIEAwYEBQEJAAAAAAABAhEDBCEFEjFBUWFxBhMiMoGRQlKhsRQjYnLB0SQzNENEc4Ki8P/EABkBAAMBAQEAAAAAAAAAAAAAAAABAgMEBf/EACARAQEAAgMBAAMBAQAAAAAAAAABAhEDITESBCJBMhP/2gAMAwEAAhEDEQA/APUqA2UaJBdwZys9IFyKoMlCCoQsHItzXjghGRbsgLwQ2CUd2XjWxeOOwGp0BNq+nYeoLwF5ZpCNiyx3A5RsnY2GPYVPbJyASgb3BPsJcFdMmjbK4gyiassEIaJUXRGgmI1UG0kr3328uiIzy+ZtWM3dJkzRV2+iPJ8czKb3ivJts7OtxTpt7+NNUcHVxlJUui+55WfJlyV6OOMwjhydS+VR9LClVrxNT4fk8LEfwM73izSY9eOe22nSy0lsh2lzq1WzW9ozPTzXWDr/AAHijW+68mVPRt9B4TrY5YJrrFJS9TbynmfZjUPncElyyV+do9RynbxZfUc+c1QOJU0G0DNmzMMEVJUFjW4eSAGSFFFIJAmrQSQJdiSKiA2QA6De1AllHUiqaDxpAUWkSGnHEzZerNEU6MshKNh8ocYMCHb7jIz9RAvKqTMsjRlyXtQhgaqHQsVEe5Lt+hFMLiDyK/ENy8mArfkIzGl4GTJiNCh25n9CsmOK62yVOe0BklSbbpJdfAbkq9jn8WyNYpJbtp/ajD8i6wrXhn7R5WOolKclGbcHJ9X13NMn4GXRYu/RDMman3+xx8eMkddy3W/TPY0qMfA5en1kLq2vVHTjkVWjoiKdSfZfY53FdGuVySSa8O50oLaxOs+R+heWM0WnO9mE3nXkme2W55T2Wj/Om625Xv5nqsbHwzUrnz9WLm+g5CcvU6GaYuoxpisXUbJgmlTVFJlNlxHol2SypEACsgNkBLolB0RROikEKEqLlEGiSaFPYysZCdJoWBmxkl9hU5v6EkAyTQFhKLYc8dIVMtDo5l0qhJTFTbLFQ/yXy7XfYXaSVkHBuVJsxzk33Dnk9BLYlAmczik+ZckZR57Sq0dGZ5KVxyu+qlbf1s5+fvHTu/D4f+m7vxqz8MnCPM6ryOdLFN/K0vod3imqbjt0kk/0OOslHNh4dhGoxyVczTdeFOzZo8TeNq9+xjzZFdtpHR0GSNbNWawMGHUSjLlc3H1T5fubtRlfu5X+Vu10Zs90t9k15is2ONJdE2r8le5p89JrR7N6Rxg8ktnLovFeJ2LCcVSrpSrwoA048dRyZenY5J9UVmjTFBOV9exqleF7mibRmj1JKQJqmQgTiODSkRlojCkohdEETq0HHGO5KXYFWdCFUt/QzM3cu3qYpqmLYUUQjQKDImOFkofii660TsL5F0BcNxkPNlyXmSpjywpi2aNRB2Z2B6Mhk2a8jPkdlsFk0RRVWENxY31JqiZY/I4fF+FScueEU2+u9HpHHYW47GeU21487henjsiklyy6rajJkOjxRfG31TbX1TOflx2qOV1FwhG1zNI6eDTY+qV09tziYNAuZ/zJx+nMjVpdFlU+ZZFy/wBtX9Cps668dtivdub5PzbFwTe3Vv8Ac7Gj0Th8Tpvy7GmPdZXLTRjhUUuySX2Lnh7ob2Iro2jlt3WSiBTW5RQUWQgEPFG2PlAVgvsaF5jSQ8dANGuthOTHW4EUQhAJ3FNFRyLxAen8y/4XzN0C98kKyNfUtYPMVkhQtgDZLBKbEqGpDOal1RlRGI2hzXW6Isi8UZWCxG1Sku7TFZYeaE2VKQqpGUkU2BNkhopLwD567oxFMmnGucgZu1WxlJJ9yaqevOa+fxSX9T+5jcjRxGX8yXhbMkjkvrtPxaeEut/c3QgorY5eGEr2s344v8TLxK7b+Gq8i+rO6m/I8tljLllKEuWUIuafp2NPBOPRzfBOoZfN7S9DbHpz8kd+wosQUy2VMnAVKLXUuypDCi4xsoteQyaMcaGJGW5eZfPLzGlpii2+xm95IjySAhShuQHnf/yKAndc1foU59+wpLuVmexshJZfATOVlAyYjUxmnW4odgTEZqq2VNIivyBk5X2JUJ1QEUiTcq6IpX4L7ioVSvoI1PXoO38DJnbvcSoVKRMb33AkwsbFabTsVOq7GLU8QUd9tkeb4n7Rq2k78PMxyzkXMbXp8urgtluJy6j4HKure39KPG6TizlNRb3/AEPUaiN4orwxN/oZ/dyulySMEOIJ7yxRySdt2uXr0E6jUQlGX8mMdlT5ns/Eyqu3gv2DnvGXlQ8Z0X1fpeHNsaVPucqEqN+iwvK/CCe/mGO/I67ZJt0NNG8WSb6OEkvSup4OeRp2nTXc+ja+oYMnZLHL9j5plZpn1NOHPL6u3peDceyVyuTuK772dvT+0NupRT8+h85jkcXa7HSway1dmEzpyyvomLimKXV8vqa4ThLpJP0Z80jr33GYOKtO7a9GXOSn8x9GaIeT0vtO40pPn9ev3Oxw7juLNLkT5Z+D6P0ZtOSVFmnbhNBRZlChMtFa2XsJtlxl2AhWUHRQBtnl7UJsjYNm1ZioBkcgbEazXHaJkitzRJOibTMgiq3BVgJsnZwzIyuwuTd9CpN+H6gqCRh1D3ZpUn4GHLK2Spn1OoUFbOLr+OJJ7o5vtdrpLNyJ7KEf13PNzm5PdmGeeq0lkbeJcYnPZNpHLcnd3uXP1sWjC1Nzta9DkqcX5n0XWS5YL/s1/wCp81wTpp+DR7rV8TwvaWSO8Uqj8TrlXgPj9GN6c3HK6fkv2HN/BP0B00sLSXNl26pRXy/Y0x1GmT+DI5bfLKvE1mhPdsuh4c5tOSqP7npdLhUVSVIx6TV42+VTjf5bRr1ebki3aunVtdTXCSHyZ3KuD7YcSqKwxe8t5+S7I8ZJmriU5vLLnacr3a3RjkzLky3WdBImKbTKZcTEpWjM14/ZiUA+o/Gip2LkpJ+Jr02RwkpR2aaa9TNB7hqe5rNFuvqGg1PvcUMn5lv69xxx/ZPLzaevyya++52GdEU0YmEomWMqNGOV79wSOmQnOQAcRIpD1DbzNLWZeSFIVYzNd14CxGPF1HSm7WwvB6WHzb9GTTi5TfgCpPwLnPYH3nk/sJUU5u+gGTI66FPJ5P7Ayy+T+wlRPevwMcjRPJszOSb557WZL1M67Uv0OPFnR9oF/tOX++RzLOTkt+hlVMohCUIjToOb3keSua9m+hmQ3T1zLmbSvdrsghvofAYvl5skYe8px5o1XKcviukrJJR0kMkFVNOm9jd7PzhHCuRynFt7vr6swcVUfey/2t4pbfDey2N5P1aS9MNY47z0E15xv/AjU6rTz+eGohXRNzaRq5c34NZjn5SoHL/F079zkX0IJ53Ko2+S+W9r60Js0Z735kk7dpdDITkirY/Q4VOcYvo3vXgIZr4bkUckW/EgY6+pts4nwqMFz45NxtKSfVeZglKlR6Ccrx5F/SzzWKLe78djTG6jo/I45jr5gkn9A4o6OXguRY/eqpbW4K7ijPw/S8+SEXtzSS9C8btz3Gz17b2LwtYHJ/ina9EjuSK0mCOOEYR+WKpf6jJqzpiigoyoqiDTRvIQEgE6nJTQ9CZJ+TKlOSKqC8srbYtspyBsRteDZEiyotcvUqxHF5F0LFubsjlsI1WwZsqwW9xKgcz2EDMzFiN8+9rsXLqZP8yT/Q4DZ6b24X89f2L9zzTOXl/0MgllEM0LDwv4l6oWXF7gT3/CNQuSMZR93KVtRSVUjlcT1eKWR82mnNX8/L1F6WE/d28im2pNP8vwdAow1fbLikuyNvq600jE8mkfXFmh9Ghc1pa+HPlh5Ns6bnrF1xYZ/VGbPmzV8Wji/SiTcDO1vUuZXtLxM5p1t27h7v8Ap8DJZOTOisOL/cVYeMmCevXYKun0lFX9UVwrhkIOUpK6fwvt5bA4YXS/pX7GvT5OWXxLb9Cv49Gz6kM1fFFBNQrdb2ee0vNk1EeRO3NPbxs6nHMUZQ54dYvftaMPA9esOWM5K0tn5X3NMMdd7Yc98j6RHor6hIXhyxnFSi7i1s0MOmViHJHuLHIGaHE0BCFjS7EAM8tvUFvuJzTtgkLZSRTJB7gDZwRTw+ZJT6bl+88xUyXi67gzxbdWNUgZvoI4BYfMp4xsmLTBWwTigQ5gok3gfbb/AIj/AMEeckeo9uMf82L8Y/szy02c3L6eSiFWSzNmlksEliJ6Thk8fuXSa+GfO/F8u7RnUdI+mXJH6sbwycvcfKnSycq/N0DlqZ/i0cX6JGv8azwMMGL8GsmvVhy0+Svh1ifrQh6jD+PRteiFTnou8MkH4biDFxDDJP48kcja6o5p0M8tPX8v3ifbm6HPydSbUZJY3T45SfwpulvXYQbuD6tQyLm+WWzJGE3ZHc0mR1CVNOl90duNbcyrmVoz6Rwktq23N2ecZJL8pcel5NON7QSUMa5e7pnAUrR2/aCGyaapdV/k888Vbps0lcXP69d7H8TcZe5k/hl8vk/A9mfKNHmcZRknummfUNDqFkhGa6SSZvjWUp/KXRZCxQcpAiAl0HPtWxlyS3ZqclVrsYWxkuQxYPMXBbmxIQZpafzAlgddTQn1BmxbNnWJ+JTgzRYCe4GTyMtJjJMEAEjLYLJVHkPbrHtCXm0eKyM9v7cy+CC/qf7HhpHNzHkJFMqLIzJFWCi7KYE7nDP9w/ir59/y/LuOxQy/h1cPrQjhrSwNtcyuVx8flVAZJYO+nyx81ZpPGmPjocuqXTLhn60Bmlm/5mnx5POJgX8L+fPD6sZFY/waycf7mxbUCSV74p4vpzROZrMSUqTUu9pV+h08kV1/jW/qY9XOLX+9jNr+mm/qSVjmgh5IirJYunw3iEoS6tqqryOvh4tDvJnloypm3G06fj1CWtsOayaro8R4qptRjuvEzGPVSp+nkacU7SZrx3vtPJlsaVOz2Xsbr7TwvtvH07o8adj2YzqOohfe4/c6Izl0+iplgRYRqqoQhBEapOqAohBgzAtx8pEIBFoGRCCUuxaLIIBkUQgBTAkiEFTjxvt3LbGv7meMnIhDl5jyDjYTIQyiFEKIAdzh8Je4XL83P8N+PNE3PDrPHG19CENMe2k8Z8ktRH5sWKf1Qh6m/m0mP6SiQgUy5Z8b/wCkX0lH/Uzzmn8umivWSIQihizY2nTVeRlyQIQbO+lsdp8tMogqho1s1KnVbbmzh+nUoven+hZC8fTqpRp0a+FYpTywjHq5L9GQh04k+mYxpCGq1kIQeif/2Q==',
                    mimetype: 'image/jpeg',
                },
            ],
        },
    },
    {
        name: 'Storage Failure',
        value: {
            subject: 'Storage failure on server 1',
            messageHtml: `<p>Storage failure event on server1 at ${new Date(
                Date.now(),
            ).toLocaleTimeString()} ${new Date(
                Date.now(),
            ).toLocaleDateString()}. See attached error log or <a href="http://${systemId}/some/server/endpoint">see storage</a>.</p>`,
            messageText: `Storage failure event on server1 at ${new Date(
                Date.now(),
            ).toLocaleTimeString()} ${new Date(
                Date.now(),
            ).toLocaleDateString()}. See attached error log or go to http://${systemId}/some/server/endpoint.`,
            attachments: [
                {
                    filename: 'error.log',
                    mimetype: 'text/plain',
                    content: 'U3RvcmFnZSBFcnJvciBMb2cKClNvbWUgZXZlbnQKQW5vdGhlciBldmVudA==',
                },
            ],
        },
    },
    {
        name: 'Analytics Event',
        value: {
            subject: 'Person identified on camera 2',
            messageHtml: `<p>Persond identified on camera 2 at ${new Date(
                Date.now(),
            ).toLocaleTimeString()} ${new Date(
                Date.now(),
            ).toLocaleDateString()}. See screenshot or view metadata.</p>`,
            messageText: `Person identified on camera 2 at ${new Date(
                Date.now(),
            ).toLocaleTimeString()} ${new Date(
                Date.now(),
            ).toLocaleDateString()}. See screenshot or view metadata.`,
            attachments: [
                {
                    filename: 'person-identified-metadata.json',
                    mimetype: 'application/json',
                    content:
                        'ewogICAgImZ1bGxOYW1lIjogIkJvYiBSb3NzIiwKICAgICJhY2N1cmFjeSI6IDAuOTMKfQ==',
                },
                {
                    filename: 'person-identified-event.jpg',
                    content:
                        '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',
                    mimetype: 'image/jpeg',
                },
            ],
        },
    },
];

@UntilDestroy()
@Component({
    selector: 'nx-email-notifications-component',
    templateUrl: 'email-notifications.component.html',
    styleUrls: ['email-notifications.component.scss'],
})
export class EmailNotificationsComponent {
    CONFIG: IConfig;
    account$: Observable<Account>;
    systems$: Observable<SystemDropdownItem[]>;
    users$ = new BehaviorSubject<any[]>([]);
    usersSelected$: Observable<string>;
    selectedSystem$ = new BehaviorSubject<SystemDropdownItem>(null);
    system: NxSystem;
    subject = '';
    messageHtml = '';
    messageText = '';
    payload = '';
    response = '';
    endpoint = '';
    payloadPreview = '';
    attachments = [];
    sending = false;
    cachedCustom;
    notificationTypes: NotificationDropdownItem[] = getTestEvents();
    apiBase: string = apiBase;

    selectedNotificationType: NotificationDropdownItem = this.notificationTypes[0];

    @ViewChild('targets') targets: CdkTextareaAutosize;

    updateType(notificationType: NotificationDropdownItem): void {
        if (this.selectedNotificationType.name === this.notificationTypes[0].name) {
            this.cachedCustom = ['subject', 'messageHtml', 'messageText', 'attachments'].reduce(
                (values, key) => ({ ...values, [key]: this[key] }),
                {},
            );
        }

        this.selectedNotificationType = notificationType;
        const isCustom = this.selectedNotificationType.name === this.notificationTypes[0].name;
        const existing = isCustom && this.cachedCustom;
        Object.assign(this, existing || notificationType.value);
        this.updatePreview();
    }

    updateSystem(systemDropdown: SystemDropdownItem): void {
        this.selectedSystem$.next(systemDropdown);
        this.notificationTypes = getTestEvents(systemDropdown.value);
    }

    updateUser(userSelection): void {
        userSelection.value = !userSelection.value;
        this.users$.next(
            this.users$.value.map(user => (user.id === userSelection.id ? userSelection : user)),
        );
    }

    handleSendAnother(): void {
        this.response = '';
        this.payload = '';
    }

    updatePreview(): void {
        this.payloadPreview = this.getPayloadJSON();
    }

    checkStep({ selectedIndex }): void {
        if (selectedIndex === 2) {
            this.updatePreview();
        }
    }

    preparePayload(): EmailNotification {
        const { subject, messageHtml, messageText, attachments } = this;
        const targets = this.users$.value.filter(({ value }) => value).map(({ id }) => id);
        const systemId = this.selectedSystem$.value.value;
        return { systemId, subject, messageHtml, messageText, targets, attachments };
    }

    getPayloadJSON(payload?) {
        return JSON.stringify(payload || this.preparePayload(), null, 4);
    }

    handleSend(): void {
        this.sending = true;
        const payload = this.preparePayload();
        this.payload = this.getPayloadJSON(payload);
        this.cloudApi
            .testEmailNotification(payload)
            .pipe(
                finalize(() => {
                    this.sending = false;
                }),
            )
            .subscribe(res => {
                this.response = JSON.stringify(res, null, 4);
            });
    }

    usersToCheckboxes = users =>
        users
            .filter(({ isEnabled }) => isEnabled)
            .map(({ accountFullName: label, accountEmail: id }) => ({
                label,
                id,
                value: id === this.accountService.email,
            }));

    handleFileDrop = (files): void => {
        files.forEach(({ fileEntry }) => {
            let filename;
            let mimetype;
            const fileReader = new FileReader();
            fileReader.onload = _ => {
                const content = (fileReader.result as string).split(',')[1];
                const attachment = { filename, mimetype, content };
                this.attachments.push(attachment);
                this.updatePreview();
            };

            if (typeof fileEntry.file === 'function') {
                fileEntry.file((file: File) => {
                    filename = file.name;
                    mimetype = file.type;
                    fileReader.readAsDataURL(file);
                });
            } else {
                fileReader.readAsDataURL(fileEntry);
            }
        });
    };

    removeAttachment(index): void {
        this.attachments.splice(index);
        this.updatePreview();
    }

    constructor(
        configService: NxConfigService,
        private accountService: NxAccountService,
        private systemsService: NxSystemsService,
        private cloudApi: NxCloudApiService,
        private ngZone: NgZone,
    ) {
        this.CONFIG = configService.config;
        this.endpoint = `POST ${this.CONFIG.cloudHost}${this.apiBase}/notifications/email_notification`;
        this.account$ = from(this.accountService.requireLogin() as Promise<Account>);
        this.systems$ = this.systemsService.forceUpdateSystems().pipe(
            map(systems =>
                systems.map(({ name, id: value, stateOfHealth: state }) => ({
                    name,
                    value,
                    state,
                })),
            ),
            tap(systems => {
                if (!this.selectedSystem$.value) {
                    this.updateSystem(
                        systems.find(({ state }) => state === 'online') || systems[0],
                    );
                }
            }),
            shareReplay({
                bufferSize: 1,
                refCount: true,
            }),
        );

        this.selectedSystem$
            .pipe(
                filter(systemId => !!systemId),
                switchMap(({ value: systemId }) => this.cloudApi.users(systemId)),
                shareReplay({
                    bufferSize: 1,
                    refCount: true,
                }),
                map(this.usersToCheckboxes),
                untilDestroyed(this),
            )
            .subscribe(this.users$);

        this.usersSelected$ = this.users$.pipe(
            map(
                users =>
                    JSON.stringify(
                        users.filter(({ value }) => value).map(({ id }) => id),
                        null,
                        4,
                    ) + '\n',
            ),
        );

        this.ngZone.onStable.pipe(untilDestroyed(this)).subscribe(() => {
            this.targets?.resizeToFitContent(true);
        });
    }
}
