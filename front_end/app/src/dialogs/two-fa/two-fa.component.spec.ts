import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Renderer2 } from '@angular/core';
import {
    ComponentFixture,
    TestBed,
    waitForAsync,
    inject,
    fakeAsync,
    tick
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { QrCodeModule } from 'ng-qrcode';
import { ClipboardService } from 'ngx-clipboard';
import { of } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxToastService } from '@dialogs/toast.service';
import { T_FA_STEPS, TwoFAModalContent } from '@dialogs/two-fa/two-fa.component';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { IConfig, NxConfigService } from '@services/nx-config';
import { nxConfig } from '@services/nx-config/config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { NxSystemsService } from '@services/systems.service';

// Mock class for NgbModalRef
export class MockNgbModalRef {
    result: Promise<any> = new Promise((resolve, reject) => resolve('x'));
}

describe('TwoFAModalContent', () => {
    let component: TwoFAModalContent;
    let fixture: ComponentFixture<TwoFAModalContent>;
    let el: HTMLElement;
    let LANG: LanguageI18NStaticTypes;
    let CONFIG: IConfig;
    let processServiceSpy: jasmine.SpyObj<NxProcessService>;

    const configMock = { getConfig: () => nxConfig };
    const translateMock = {
        translations: {
            Next: 'Next',
            '2fa': 'Two-factor authentication',
            requiredPassword: 'Enter your password to verify your identity',
            qrText1: 'Scan this QR code with the authentication app on your mobile device to link the app to your %CLOUD_NAME% account.',
            qrText2: 'Install an authentication app on your mobile device if you do not already have one. %CLOUD_NAME% supports Google Authenticator, Microsoft Authenticator or Duo Mobile.',
            'Cannot scan QR code?': 'Cannot scan QR code?',
            'Show QR code': 'Show QR code',
            paramsText: 'Enter the following parameters into authentication app to link it to your %CLOUD_NAME% account.',
            codeText: 'Get a code from the authentication app and enter it below to complete the verification process.',
            enterVerification: 'Enter verification code',
            finishLine1: 'Two-factor authentication is now enabled for your %CLOUD_NAME% account!',
            saveBackupCodes: 'Save these single-use backup codes in a safe place.',
            Ok: 'Ok',
            pageTitles: {
                security: 'Security'
            },
            dialogs: {
                twoFa: {
                    installAuthApp: () => 'Install an authentication app on your mobile device if you do not already have one. %CLOUD_NAME% supports <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong> or <strong>Duo Mobile</strong>.',
                    nowEnabled: () => 'Two-factor authentication is now <strong>enabled</strong> for your %CLOUD_NAME% account!'
                }
            }
        }
    };

    let accountSpy: jasmine.SpyObj<NxAccountService>;
    let nextStepSpy;
    let prevStepSpy;

    beforeEach(waitForAsync(() => {
        const spyCreateProcess = jasmine.createSpyObj(
            'NxProcessService',
            ['createProcess']
        );
        const clipboardMock = {
            copyResponse$: of({ isSuccess: false })
        };
        const systemsServiceMock = {
            systemsSubject: of([])
        };
        const accountMock = {
            get2FaBackupCode: () => [
                { backup_code: 'random1' },
                { backup_code: 'random2' },
                { backup_code: 'random3' },
                { backup_code: 'random4' }
            ],
            updateSessionWith2fa: {
                resultCode: 'tfaCode',
                errorClass: '',
                errorDetail: 0,
                errorText: ''
            },
            account: {
                can_publish_integration: false,
                name: 'Test',
                first_name: 'Test',
                isCloud: false,
                is_staff: false,
                language: 'en_US',
                last_name: '1234',
                permissions: [],
                is_superuser: false,
                id: 'test',
                email: 'test@test.com',
                is_authenticated: false,
                cookie_reviewed: true,
                account2faEnabled: false
            }
        };

        TestBed
            .configureTestingModule({
                declarations: [
                    TwoFAModalContent
                ],
                providers: [
                    { provide: NxConfigService, useValue: configMock },
                    { provide: NxLanguageProviderService, useValue: translateMock },
                    { provide: NxProcessService, useValue: spyCreateProcess },
                    { provide: Renderer2, useValue: {} },
                    { provide: NxAccountService, useValue: accountMock },
                    { provide: NgbActiveModal, useValue: {} },
                    { provide: NxToastService, useValue: {} },
                    { provide: ClipboardService, useValue: clipboardMock },
                    { provide: NxSystemsService, useValue: systemsServiceMock },
                    { provide: NxCloudApiService, useValue: {} }
                ],
                imports: [
                    FormsModule,
                    HttpClientTestingModule,
                    AngularSvgIconModule.forRoot(),
                    QrCodeModule
                    // NgbModule.forRoot()
                ]
            }).compileComponents()
            .then(inject([NxLanguageProviderService], (service: NxLanguageProviderService) => {
                LANG = service.translations;
                CONFIG = configMock.getConfig();
                fixture = TestBed.createComponent(TwoFAModalContent);
                component = fixture.componentInstance;
                el = fixture.debugElement.nativeElement;
                // modalService = TestBed.get(NgbModal);

                processServiceSpy = TestBed.inject(NxProcessService) as jasmine.SpyObj<NxProcessService>;
                nextStepSpy = spyOn(component, 'next');
                prevStepSpy = spyOn(component, 'prev');

                component.type = '';
                component.ngAfterViewInit();
            }));
    }));

    // Breadcrumbs for testing modal
    // it('should open modal', () => {
    //     spyOn(modalService, 'open').and.returnValue(mockModalRef as any);
    //     const dialog = modalService.open('<xxxx>', { size: 'lg' });
    //     expect(modalService.open).toHaveBeenCalledWith('<xxxx>', { size: 'lg' });
    // });

    it('should create component', () => {
        expect(component).toBeTruthy();
    });

    describe('when in WIZARD mode', () => {
        it('should init with LOGIN', () => {
            // compare templates before HTML is compiled
            expect(component.templateType).toBe(component.wizardLoginTemplate);
            fixture.detectChanges();

            const header = el.querySelector<HTMLHeadingElement>(
                'div.modal-header h1'
            );
            const formLabel = el.querySelector<HTMLLabelElement>(
                'div.modal-body form div.form-group label'
            );
            const formInput = el.querySelector<HTMLInputElement>(
                'div.modal-body form div.form-group input'
            );
            const buttonText = el.querySelector<HTMLSpanElement>(
                'div.modal-footer button span'
            );
            const buttonIcon = el.querySelector(
                'div.modal-footer button svg-icon'
            );

            expect(header.innerText).toBe(LANG['2fa']);
            expect(formLabel).toBeDefined();
            expect(formLabel.innerText).toBe(LANG['requiredPassword']);

            expect(formInput).toBeDefined();
            expect(formInput.type).toBe('password');
            expect(formInput.pattern).toBe(
                CONFIG.credentialsValidation.passwordRequirements.requiredRegex
            );

            expect(buttonText.innerText).toBe(LANG['Next']);
            expect(buttonIcon).toBeDefined();
        });
    });

    describe('when in QR mode', () => {
        const keyUrl = 'otpauth://totp/ttsolov@networkoptix.com?secret=JBSWY3DPEHPK3PXP';

        beforeEach(fakeAsync(() => {
            fixture.detectChanges();
            component.ngAfterViewInit();
            component.setTemplate(T_FA_STEPS.WizardQR);
            tick();
            fixture.detectChanges();
            expect(component.templateType).toEqual(component.wizardQRTemplate);
        }));

        it('should have elements (QR mode)', () => {
            // const valueQR = keyUrl;
            // const accessCode = keyUrl.slice(-16);
            const bodyText = el.querySelectorAll<HTMLParagraphElement>('#qrText p');
            const bodyQR = el.querySelector('#qrBadge qr-code');
            const buttonText = el.querySelector<HTMLSpanElement>('#nextWizardCode span');
            const buttonIcon = el.querySelector('#nextWizardCode svg-icon');
            const buttonMode = el.querySelector('#qrMode');
            const buttonModeText = el.querySelector<HTMLSpanElement>('#qrMode span');

            expect(bodyText.item(0).innerText).toBe(LANG['qrText1']);
            expect(bodyText.item(1).innerText).toBe(LANG['qrText2']);
            expect(bodyQR).toBeDefined();

            expect(buttonText.innerText).toBe(LANG['Next']);
            expect(buttonIcon).toBeDefined();

            expect(buttonMode).toBeDefined();
            expect(buttonModeText.innerText).toBe(LANG['Cannot scan QR code?']);
        });

        it('should switch to PARAMS mode', fakeAsync(() => {
            el.querySelector('#qrMode').dispatchEvent(new MouseEvent('click'));
            expect(component.showQR).toBeFalse();
        }));

        it('should proceed to next step', () => {
            el.querySelector('#nextWizardCode')
                .dispatchEvent(new MouseEvent('click'));
            expect(nextStepSpy).toHaveBeenCalled();
        });
    });

    describe('when in CODE mode', () => {
        beforeEach(fakeAsync(() => {
            fixture.detectChanges();
            component.ngAfterViewInit();
            component.setTemplate(T_FA_STEPS.WizardCode);
            tick();
            fixture.detectChanges();
            expect(component.templateType).toEqual(component.wizardCodeTemplate);
        }));

        it('should have elements', () => {
            const codeText = el.querySelector<HTMLDivElement>('#codeText');
            const codeLabel = el.querySelector<HTMLLabelElement>(
                'div.modal-body form div.form-group label'
            );
            const codeInput = el.querySelector(
                'div.modal-body form div.form-group input'
            );

            expect(codeText.innerText).toBe(LANG['codeText']);
            expect(codeLabel.innerText).toBe(LANG['enterVerification']);
            expect(codeInput).toBeDefined();
        });

        it('should proceed to prev step', () => {
            el.querySelector('#previousWizardQR')
                .dispatchEvent(new MouseEvent('click'));
            expect(prevStepSpy).toHaveBeenCalled();
        });

        it('should proceed to next step', () => {
            el.querySelector('#nextWizardFinish')
                .dispatchEvent(new MouseEvent('click'));
            expect(nextStepSpy).toHaveBeenCalled();
        });
    });

    describe('when in FINISH mode', () => {
        beforeEach(fakeAsync(() => {
            fixture.detectChanges();
            component.ngAfterViewInit();
            component.setTemplate(T_FA_STEPS.WizardFinish);
            tick();
            fixture.detectChanges();
            component.newCodes = Array(8).fill('000000');
            fixture.detectChanges();
            expect(component.templateType)
                .toEqual(component.wizardFinishTemplate);
        }));

        it('should have elements', () => {
            const line1Text = el.querySelector<HTMLDivElement>(
                'div.modal-body div.line1'
            );
            const line2Text = el.querySelector<HTMLParagraphElement>(
                'div.modal-body .mt-3 p'
            );
            const codeLines = el.querySelectorAll(
                '.code-area .code-area-code'
            );
            const buttonText = el.querySelector<HTMLButtonElement>(
                '#wizardDone span'
            );

            expect(line1Text.innerText).toBe(LANG['finishLine1']);
            expect(line2Text.innerText).toBe(LANG['saveBackupCodes']);
            expect(codeLines.length).toBe(8);
            expect(buttonText.innerText).toBe(LANG['Ok']);
        });

        it('should proceed to next step', () => {
            el.querySelector('#wizardDone')
                .dispatchEvent(new MouseEvent('click'));
            expect(nextStepSpy).toHaveBeenCalled();
        });
    });
});
