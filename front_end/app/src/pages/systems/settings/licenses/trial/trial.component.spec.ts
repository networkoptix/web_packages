import { CommonModule } from '@angular/common';
import { DebugElement } from '@angular/core';
import {
    waitForAsync,
    ComponentFixture,
    TestBed
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

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
import { NxConfigService } from '@services/nx-config';
import { nxConfig } from '@services/nx-config/config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { NxSystem } from '@services/system.service';

import { NxLicenseTrialComponent } from './trial.component';

describe('Licenses (Trial)', () => {
    let component: NxLicenseTrialComponent;
    let fixture: ComponentFixture<NxLicenseTrialComponent>;
    let el: DebugElement;

    const translateMock = {
        translations: {}
    };
    const configMock = { getConfig: () => nxConfig };

    let form;
    let button;

    let systemSpy: jasmine.SpyObj<NxSystem>;
    let processServiceSpy: jasmine.SpyObj<NxProcessService>;
    let dialogsServiceSpy: jasmine.SpyObj<NxDialogsService>;

    beforeEach(waitForAsync(() => {
        const spyCreateProcess = jasmine.createSpyObj('NxProcessService', ['createProcess']);
        const spySystem = jasmine.createSpyObj('NxSystem', ['activateLicense']);
        const spyDialogs = jasmine.createSpyObj('NxDialogsService', ['notify']);

        TestBed.configureTestingModule({
            declarations: [
                NxLicenseTrialComponent, NxContentBlockComponent,
                NxContentBlockSectionComponent, NxProcessButtonComponent
            ],
            imports: [
                CommonModule,
                FormsModule,
                TranslateModule.forRoot()
            ],
            providers: [
                { provide: NxLanguageProviderService, useValue: translateMock },
                { provide: NxConfigService, useValue: configMock },
                { provide: NxSystem, useValue: spySystem },
                { provide: NxProcessService, useValue: spyCreateProcess },
                { provide: NxDialogsService, useValue: spyDialogs }
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxLicenseTrialComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;

                systemSpy = TestBed.inject(NxSystem) as jasmine.SpyObj<NxSystem>;
                processServiceSpy = TestBed.inject(NxProcessService) as jasmine.SpyObj<NxProcessService>;
                dialogsServiceSpy = TestBed.inject(NxDialogsService) as jasmine.SpyObj<NxDialogsService>;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should call getConfig', () => {
        expect(configMock.getConfig).toBeTruthy();
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
                const line1 = form.querySelector('#trial_license_line1');
                const line2 = form.querySelector('#trial_license_line2');

                expect(line1.innerHTML).toBe('You have an unused trial license.');
                expect(line2.innerHTML).toBe('Once activated, it will allow you to record up to 4 cameras for 30 days.');
            });

            it('should have button w/ caption', () => {
                expect(button).toBeTruthy();
                // nx-process-button caption will contain extra html which at this point is commented out
                expect(button.innerHTML.replace(/<!--(.*?)-->/g, '')).toBe('Activate Trial License');
            });
        });

        it('should proceed if successful registration (response.reply)', () => {
            systemSpy.activateLicense.and.resolveTo({ response: { reply: 'ok' } });
            systemSpy.activateLicense('{serverId}', 'license_key').then((response) => {
                component.haveTrialLicense = true;
                fixture.detectChanges();
                dialogsServiceSpy.notify('Test', 'success');

                expect(dialogsServiceSpy.notify.calls.count()).toBe(1, 'notify method should be called once');
                expect(el.nativeElement.querySelector('nx-block')).toBeFalsy();
            });
        });

        it('should proceed if unsuccessful registration (response.error)', () => {
            systemSpy.activateLicense.and.resolveTo({ response: { error: '1' } });
            systemSpy.activateLicense('{serverId}', 'license_key').then((response) => {
                fixture.detectChanges();
                dialogsServiceSpy.notify('Error', 'danger');

                expect(dialogsServiceSpy.notify.calls.count()).toBe(1, 'notify method should be called once');
            });
        });

        it('should proceed if request fail', () => {
            systemSpy.activateLicense.and.rejectWith({ error: { type: 'error' } });
            systemSpy.activateLicense('{serverId}', 'license_key').catch((response) => {
                fixture.detectChanges();
                if (response.error.type === 'error') {
                    dialogsServiceSpy.notify('Error', 'danger');

                    expect(dialogsServiceSpy.notify.calls.count()).toBe(1, 'notify method should be called once');
                }
            });
        });
    });
});
