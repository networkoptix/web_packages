import { Renderer2 } from '@angular/core';
import {
    ComponentFixture,
    TestBed,
    waitForAsync,
    fakeAsync,
    tick,
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MockModule, MockProvider } from 'ng-mocks';
import { QrCodeModule } from 'ng-qrcode';

import {
    NxProcessButtonComponent
} from '@components/process-button/process-button.component';
import {
    NxProcessCancelButtonComponent
} from '@components/process-cancel-Button/process-cancel-button.component';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { NxSystemsService } from '@services/systems.service';
import { NxToastService } from '@services/toast.service';
import { WINDOW } from '@services/window-provider';

import { TwoFAModalContent } from './two-fa.component';
import { T_FA_STEPS } from './two-fa.component.types';

describe('TwoFAModalContent', () => {
    let component: TwoFAModalContent;
    let fixture: ComponentFixture<TwoFAModalContent>;
    let el: HTMLDivElement;

    const templateText = {
        wizardLogin: {
            header: 'Two-factor authentication',
            formLabel: 'Enter your password to verify your identity',
            buttonText: 'Next',
        },
        wizardQR: {
            bodyText0: 'Scan this QR code with the authentication app on your mobile device to link the app to your %CLOUD_NAME% account.',
            buttonText: 'Next',
            buttonModeText: 'Cannot scan QR code?',
        },
        wizardCode: {
            codeText: 'Get a code from the authentication app and enter it below to complete the verification process.',
            codeLabel: 'Enter verification code',
        },
        wizardFinish: {
            line2: 'Save these single-use backup codes in a safe place.',
            buttonText: 'Ok',
        },
    };

    let nextStepSpy: jasmine.Spy;
    let prevStepSpy: jasmine.Spy;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                TwoFAModalContent,
                NxProcessButtonComponent,
                NxProcessCancelButtonComponent,
            ],
            providers: [
                MockProvider(NxConfigService),
                MockProvider(NxLanguageProviderService),
                MockProvider(NxProcessService),
                MockProvider(Renderer2),
                MockProvider(NxAccountService),
                MockProvider(DialogRef),
                MockProvider(DIALOG_DATA),
                MockProvider(NxToastService),
                MockProvider(NxSystemsService),
                MockProvider(NxCloudApiService),
                { provide: WINDOW, useValue: window }
            ],
            imports: [
                FormsModule,
                MockModule(AngularSvgIconModule),
                MockModule(QrCodeModule),
                MockModule(TranslateModule),
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(TwoFAModalContent);
        component = fixture.componentInstance;
        el = fixture.debugElement.nativeElement;

        nextStepSpy = spyOn(component, 'next');
        prevStepSpy = spyOn(component, 'prev');

        component['dialogData'] = {
            type: 'wizard',
        };
        component.ngOnInit();
        component.ngAfterViewInit();
    }));

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

            const { wizardLogin: wizardLoginText } = templateText;

            expect(header.innerText).toBe(wizardLoginText.header);
            expect(formLabel).toBeDefined();
            expect(formLabel.innerText)
                .toBe(wizardLoginText.formLabel);

            expect(formInput).toBeDefined();
            expect(formInput.type).toBe('password');
            expect(formInput.pattern).toBe(
                component.CONFIG
                    .credentialsValidation.passwordRequirements.requiredRegex
            );
        });
    });

    describe('when in QR mode', () => {
        // const keyUrl = 'otpauth://totp/ttsolov@networkoptix.com?secret=JBSWY3DPEHPK3PXP';

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
            const bodyText = el.querySelectorAll<HTMLParagraphElement>(
                '#qrText p'
            );
            const bodyQR = el.querySelector('#qrBadge qr-code');
            const buttonText = el.querySelector<HTMLSpanElement>(
                '#nextWizardCode span'
            );
            const buttonIcon = el.querySelector('#nextWizardCode svg-icon');
            const buttonMode = el.querySelector('#qrMode');
            const buttonModeText = el.querySelector<HTMLSpanElement>(
                '#qrMode span'
            );

            const { wizardQR: wizardQRText } = templateText;

            expect(bodyText[0].innerText).toBe(wizardQRText.bodyText0);
            expect(bodyText[1].innerHTML)
                .toBe(component.LANG.dialogs.twoFa.installAuthApp());
            expect(bodyQR).toBeDefined();

            expect(buttonText.innerText).toBe(wizardQRText.buttonText);
            expect(buttonIcon).toBeDefined();

            expect(buttonMode).toBeDefined();
            expect(buttonModeText.innerText).toBe(wizardQRText.buttonModeText);
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
            const codeInput = el.querySelector<HTMLInputElement>(
                'div.modal-body form div.form-group input'
            );

            const { wizardCode: wizardCodeText } = templateText;

            expect(codeText.innerText).toBe(wizardCodeText.codeText);
            expect(codeLabel.innerText).toBe(wizardCodeText.codeLabel);
            expect(codeInput).toBeDefined();
        });

        it('should proceed to prev step', () => {
            el.querySelector<HTMLButtonElement>('#previousWizardQR')
                .dispatchEvent(new MouseEvent('click'));
            expect(prevStepSpy).toHaveBeenCalled();
        });

        it('should proceed to next step', () => {
            el.querySelector<HTMLButtonElement>('.process-button')
                .dispatchEvent(new MouseEvent('click'));
            expect(component.templateType === component.wizardFinishTemplate);
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
            const codeLines = el.querySelectorAll<HTMLDivElement>(
                '.code-area .code-area-code'
            );
            const buttonText = el.querySelector<HTMLButtonElement>(
                '#wizardDone span'
            );

            const { wizardFinish: wizardFinishText } = templateText;

            expect(line1Text.innerHTML)
                .toBe(component.LANG.dialogs.twoFa.nowEnabled());
            expect(line2Text.innerText).toBe(wizardFinishText.line2);
            expect(codeLines.length).toBe(8);
            expect(buttonText.innerText).toBe(wizardFinishText.buttonText);
        });

        it('should proceed to next step', () => {
            el.querySelector<HTMLButtonElement>('#wizardDone')
                .dispatchEvent(new MouseEvent('click'));
            expect(nextStepSpy).toHaveBeenCalled();
        });
    });
});
