import { CommonModule } from '@angular/common';
import { ElementRef } from '@angular/core';
import {
    waitForAsync,
    ComponentFixture,
    TestBed
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MockModule, MockProvider, MockComponent } from 'ng-mocks';

import {
    NxContentBlockComponent
} from '@components/content-block/content-block.component';
import {
    NxContentBlockSectionComponent
} from '@components/content-block/section/section.component';
import {
    NxProcessButtonComponent
} from '@components/process-button/process-button.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import {
    ServerManager
} from '@services/system.service/server-manager/server-manager';

import { NxLicenseTrialComponent } from './trial.component';

describe('Licenses (Trial)', () => {
    let component: NxLicenseTrialComponent;
    let fixture: ComponentFixture<NxLicenseTrialComponent>;
    let el: ElementRef<HTMLDivElement>;

    let form: HTMLFormElement;
    let button: HTMLButtonElement;

    let serverManagerSpy: jasmine.SpyObj<ServerManager>;
    let dialogsServiceSpy: jasmine.SpyObj<NxDialogsService>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                NxLicenseTrialComponent,
                MockComponent(NxContentBlockComponent),
                MockComponent(NxContentBlockSectionComponent),
                NxProcessButtonComponent,
            ],
            imports: [
                MockModule(CommonModule),
                MockModule(FormsModule),
                TranslateModule.forRoot(),
            ],
            providers: [
                MockProvider(NxLanguageProviderService),
                MockProvider(NxConfigService),
                MockProvider(NxProcessService),
                MockProvider(NxDialogsService),
                MockProvider(ServerManager),
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxLicenseTrialComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;

                serverManagerSpy = TestBed.inject(ServerManager) as jasmine.SpyObj<ServerManager>;
                dialogsServiceSpy = TestBed.inject(NxDialogsService) as jasmine.SpyObj<NxDialogsService>;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    describe('Have registered trial key', () => {
        beforeEach(() => {
            component.trialLicense = '';
            component.haveTrialLicense = true;
            fixture.detectChanges();
        });

        it('should hide if no trial license provided', () => {
            expect(el.nativeElement.querySelector('nx-block')).toBeFalsy();
        });
    });

    describe('Have non-registered trial key', () => {
        beforeEach(() => {
            component.trialLicense = '0000-0000-0000-0000';
            component.haveTrialLicense = false;
            fixture.detectChanges();
        });

        it('should render if trial license provided', () => {
            expect(el.nativeElement.querySelector('nx-block')).toBeTruthy();
        });

        describe('Have elements', () => {
            beforeEach(() => {
                form = el.nativeElement.querySelector('form[id=trialLicenseForm]');
                button = el.nativeElement.querySelector('nx-process-button button');
            });

            it('should have form and description', () => {
                expect(form).toBeTruthy();
                const line1 = form.querySelector<HTMLDivElement>('#trial_license_line1');
                const line2 = form.querySelector<HTMLDivElement>('#trial_license_line2');

                expect(line1.innerText).toBe('You have an unused trial license.');
                expect(line2.innerText).toBe('Once activated, it will allow you to record up to 4 cameras for 30 days.');
            });

            it('should have button w/ caption', () => {
                expect(button).toBeTruthy();
                expect(button.innerText).toBe('Activate Trial License');
            });
        });

        it('should proceed if successful registration (response.reply)', () => {
            serverManagerSpy.activateLicense.and.resolveTo({ response: { reply: 'ok' } });
            serverManagerSpy.activateLicense('{serverId}', 'license_key').then(response => {
                component.haveTrialLicense = true;
                fixture.detectChanges();
                dialogsServiceSpy.notify('Test', 'success');

                expect(dialogsServiceSpy.notify.calls.count()).toBe(1, 'notify method should be called once');
                expect(el.nativeElement.querySelector('nx-block')).toBeFalsy();
            });
        });

        it('should proceed if unsuccessful registration (response.error)', () => {
            serverManagerSpy.activateLicense.and.resolveTo({ response: { error: '1' } });
            serverManagerSpy.activateLicense('{serverId}', 'license_key').then(response => {
                fixture.detectChanges();
                dialogsServiceSpy.notify('Error', 'danger');

                expect(dialogsServiceSpy.notify.calls.count()).toBe(1, 'notify method should be called once');
            });
        });

        it('should proceed if request fail', () => {
            serverManagerSpy.activateLicense.and.rejectWith({ error: { type: 'error' } });
            serverManagerSpy.activateLicense('{serverId}', 'license_key').catch(response => {
                fixture.detectChanges();
                if (response.error.type === 'error') {
                    dialogsServiceSpy.notify('Error', 'danger');

                    expect(dialogsServiceSpy.notify.calls.count()).toBe(1, 'notify method should be called once');
                }
            });
        });
    });
});
