import {
    ComponentFixture, TestBed,
    waitForAsync, inject, fakeAsync
}                                        from '@angular/core/testing';
import { of }                            from 'rxjs';
import { nxConfig }                      from '@services/nx-config/config';
import { IConfig, NxConfigService }      from '@services/nx-config';
import { NxLanguageProviderService }     from '@services/nx-language-provider';
import { LanguageI18NStaticTypes }       from '@app/language_i18n_static_types';
import { NxProcessService }              from '@services/process.service';
import { NxAccountService }              from '@services/account.service';
import { T_FA_STEPS, TwoFAModalContent } from '@dialogs/two-fa/two-fa.component';
import { NgbActiveModal }                from '@ng-bootstrap/ng-bootstrap';
import { FormsModule }                   from '@angular/forms';
import { HttpClientTestingModule }       from '@angular/common/http/testing';
import { Renderer2 }                     from '@angular/core';
import { NxToastService }                from '@dialogs/toast.service';
import { ClipboardService }              from 'ngx-clipboard';
import { NxSystemsService }              from '@services/systems.service';
import { AngularSvgIconModule }          from 'angular-svg-icon';

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
            Next                                                : 'Next',
            '2fa'                                               : 'Two-factor authentication',
            requiredPassword                                    : "Enter your password to verify it's really you",
            qrText                                              : "With the authentication app on your mobile device scan the following QR code to link the app to your %CLOUD_NAME% account. If you don't have an authentication app, you'll need to install one now.",
            'Cannot scan QR code?'                              : 'Cannot scan QR code?',
            'Show QR code'                                      : 'Show QR code',
            paramsText                                          : 'Enter the following parameters into authentication app to link it to your %CLOUD_NAME% account.',
            codeText                                            : 'From authentication app, get a code and enter it below to complete the verification process.',
            'Enter authentication code'                         : 'Enter authentication code',
            finishLine1                                         : 'Two-factor authentication is <span class="lineStrong">enabled</span> now!',
            'Save this single-use backup code in a safe place.' : 'Save this single-use backup code in a safe place.',
            finishNote                                          : "This backup code lets you login to %CLOUD_NAME% if you don't have access to your mobile authentication app.",
            Ok                                                  : 'Ok',
            pageTitles                                          : {
                security: 'Security'
            }
        }
    };

    let accountSpy: jasmine.SpyObj<NxAccountService>;
    let nextStepSpy;
    let prevStepSpy;

    beforeEach(waitForAsync(() => {
        const mockAccountService = jasmine.createSpyObj('NxAccountService', ['account', 'get']);
        const spyCreateProcess = jasmine.createSpyObj('NxProcessService', ['createProcess']);
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
            updateSessionWith2fa : { resultCode: 'tfaCode', errorClass: '', errorDetail: 0, errorText: '' },
            account              : {
                can_publish_integration : false,
                name                    : 'Test',
                first_name              : 'Test',
                isCloud                 : false,
                is_staff                : false,
                language                : 'en_US',
                last_name               : '1234',
                permissions             : [],
                is_superuser            : false,
                id                      : 'test',
                email                   : 'test@test.com',
                is_authenticated        : false,
                cookie_reviewed         : true,
                account2faEnabled       : false
            }
        };

        TestBed
            .configureTestingModule({
                declarations : [TwoFAModalContent],
                providers    : [
                    { provide: NxConfigService, useValue: configMock },
                    { provide: NxLanguageProviderService, useValue: translateMock },
                    { provide: NxProcessService, useValue: spyCreateProcess },
                    { provide: Renderer2, useValue: {} },
                    { provide: NxAccountService, useValue: accountMock },
                    { provide: NgbActiveModal, useValue: {} },
                    { provide: NxToastService, useValue: {} },
                    { provide: ClipboardService, useValue: clipboardMock },
                    { provide: NxSystemsService, useValue: systemsServiceMock }
                ],
                imports: [
                    FormsModule, HttpClientTestingModule,
                    AngularSvgIconModule.forRoot()
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
                // accountSpy = TestBed.inject(NxAccountService) as jasmine.SpyObj<NxAccountService>;
                // // @ts-ignore
                // accountSpy.account.and.returnValue(of({}));
                nextStepSpy = spyOn(component, 'next').and.returnValue();
                prevStepSpy = spyOn(component, 'prev').and.returnValue();

                // component.account = {
                //     can_publish_integration : false,
                //     name                    : 'Test',
                //     first_name              : 'Test',
                //     isCloud                 : false,
                //     is_staff                : false,
                //     language                : 'en_US',
                //     last_name               : '1234',
                //     permissions             : [],
                //     is_superuser            : false,
                //     id                      : 'test',
                //     email                   : 'test@test.com',
                //     is_authenticated        : false,
                //     cookie_reviewed         : true,
                //     account2faEnabled       : false
                // };

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

            const header = el.querySelector('div.modal-header h1');
            const formLabel = el.querySelector('div.modal-body form div.form-group label');
            const formInput = el.querySelector('div.modal-body form div.form-group input');
            const buttonText = el.querySelector('div.modal-footer button span');
            const buttonIcon = el.querySelector('div.modal-footer button svg-icon');

            expect(header.innerHTML).toBe(LANG['2fa']);
            expect(formLabel).toBeDefined();
            expect(formLabel.innerHTML).toBe(LANG['requiredPassword']);

            expect(formInput).toBeDefined();
            // @ts-ignore
            expect(formInput.type).toBe('password');
            // @ts-ignore
            expect(formInput.pattern).toBe(CONFIG.credentialsValidation.passwordRequirements.requiredRegex);

            expect(buttonText.innerHTML).toBe(LANG['Next']);
            expect(buttonIcon).toBeDefined();
        });
    });

    describe('when in QR mode', () => {
        const keyUrl = 'otpauth://totp/ttsolov@networkoptix.com?secret=JBSWY3DPEHPK3PXP';

        beforeEach(waitForAsync(() => {
            component.setTemplate(T_FA_STEPS.WizardQR);
            // compare templates before HTML is compiled
            expect(component.templateType).toBe(component.wizardQRTemplate);
            fixture.detectChanges();
        }));

        it('should have elements (QR mode)', () => {
            const valueQR = keyUrl;
            const accessCode = keyUrl.slice(-16);
            const bodyText = el.querySelector('div.modal-body div#qrText');
            const bodyQR = el.querySelector('div.modal-body div#qrBadge qr-code');
            const buttonText = el.querySelector('div.modal-footer button#nextWizardCode span');
            const buttonIcon = el.querySelector('div.modal-footer button#nextWizardCode svg-icon');
            const buttonMode = el.querySelector('div.modal-footer button#qrMode');
            const buttonModeText = el.querySelector('div.modal-footer button#qrMode span');

            expect(bodyText.innerHTML).toBe(LANG['qrText']);
            expect(bodyQR).toBeDefined();

            expect(buttonText.innerHTML).toBe(LANG['Next']);
            expect(buttonIcon).toBeDefined();

            expect(buttonMode).toBeDefined();
            expect(buttonModeText.innerHTML).toBe(LANG['Cannot scan QR code?']);
        });

        it('should switch to PARAMS mode', fakeAsync(() => {
            el.querySelector('div.modal-footer button#qrMode').dispatchEvent(new MouseEvent('click'));
            expect(component.showQR).toBeFalse();
        }));

        it('should proceed to next step', () => {
            el.querySelector('div.modal-footer button#nextWizardCode').dispatchEvent(new MouseEvent('click'));
            expect(nextStepSpy).toHaveBeenCalled();
        });
    });

    describe('when in CODE mode', () => {
        beforeEach(waitForAsync(() => {
            component.setTemplate(T_FA_STEPS.WizardCode);
            // compare templates before HTML is compiled
            expect(component.templateType).toBe(component.wizardCodeTemplate);
            fixture.detectChanges();
        }));

        it('should have elements', () => {
            const codeText = el.querySelector('div.modal-body form div#codeText');
            const codeLabel = el.querySelector('div.modal-body form div.form-group label');
            const codeInput = el.querySelector('div.modal-body form div.form-group input');

            expect(codeText.innerHTML).toBe(LANG['codeText']);
            expect(codeLabel.innerHTML).toBe(LANG['Enter authentication code']);
            expect(codeInput).toBeDefined();
        });

        it('should proceed to prev step', () => {
            el.querySelector('div.modal-footer button#previousWizardQR').dispatchEvent(new MouseEvent('click'));
            expect(prevStepSpy).toHaveBeenCalled();
        });

        it('should proceed to next step', () => {
            el.querySelector('div.modal-footer button#nextWizardFinish').dispatchEvent(new MouseEvent('click'));
            expect(nextStepSpy).toHaveBeenCalled();
        });
    });

    describe('when in FINISH mode', () => {
        beforeEach(waitForAsync(() => {
            component.setTemplate(T_FA_STEPS.WizardFinish);
            // compare templates before HTML is compiled
            expect(component.templateType).toBe(component.wizardFinishTemplate);
            fixture.detectChanges();
        }));

        it('should have elements', () => {
            const line1Text = el.querySelector('div.modal-body div.line1');
            const line2Text = el.querySelector('div.modal-body div.lineStrong');
            const codeLine2Text = el.querySelector('div.modal-body div.code-area-note');
            const buttonText = el.querySelector('div.modal-footer button#wizardDone span');

            // cannot compare HTML strings (rendered string have /<span _ngcontent-a-c165="" .../) ...
            // TODO: Find a way...
            // expect(line1Text.innerHTML).toBe(LANG['finishLine1']);
            expect(line2Text.innerHTML).toBe(LANG['Save this single-use backup code in a safe place.']);
            // TODO: figure out how to get newCodes updated in the template
            // const codeLines = el.querySelectorAll('.code-area-code');
            // expect(codeLines.length).toBe(4);
            expect(codeLine2Text.innerHTML).toBe(LANG['finishNote']);
            expect(buttonText.innerHTML).toBe(LANG['Ok']);
        });

        it('should proceed to next step', () => {
            el.querySelector('div.modal-footer button#wizardDone').dispatchEvent(new MouseEvent('click'));
            expect(nextStepSpy).toHaveBeenCalled();
        });
    });
});
