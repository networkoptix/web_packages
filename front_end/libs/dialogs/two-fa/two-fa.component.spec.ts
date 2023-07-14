import staticLang from '@common/language/language_i18n_static.json';
import { credentialsValidation } from '@variables/static-variables';

import { setupComponent } from '../src/setup';

import { TwoFAModalContent } from './two-fa.component';
import { TfaAction } from './two-fa.component.types';

const setupTwoFaComponent = (dialogData = { action: TfaAction.Enable }): ReturnType<typeof setupComponent<TwoFAModalContent<TfaAction>>> => setupComponent(TwoFAModalContent, {
    dialogData,
});

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

describe('TwoFAModalContent', () => {
    it('should create component', async () => {
        const { component } = await setupTwoFaComponent();
        expect(component).toBeTruthy();
    });

    describe('when in WIZARD mode', () => {
        it('should init with LOGIN', async () => {
            const { component, fixture, debugElement } = await setupTwoFaComponent();
            // compare templates before HTML is compiled
            expect(component.templateType).toBe(component.wizardLoginTemplate);
            fixture.detectChanges();

            const header = debugElement.nativeElement.querySelector(
                'div.modal-header h1'
            );
            const formLabel = debugElement.nativeElement.querySelector(
                'div.modal-body form div.form-group label'
            );
            const formInput = debugElement.nativeElement.querySelector(
                'div.modal-body form div.form-group input'
            );

            const { wizardLogin: wizardLoginText } = templateText;

            expect(header.textContent.trim()).toBe(wizardLoginText.header);
            expect(formLabel).toBeDefined();
            expect(formLabel.textContent.trim())
                .toBe(wizardLoginText.formLabel);

            expect(formInput).toBeDefined();
            expect(formInput.type).toBe('password');
            expect(formInput.pattern).toBe(credentialsValidation.passwordRequirements.requiredRegex);
        });
    });

    describe('when in QR mode', () => {
        it('should have elements (QR mode)', async () => {
            const { debugElement, tick, component } = await setupTwoFaComponent();
            component.templateType = component.wizardQRTemplate;
            await tick();
            const bodyText = debugElement.nativeElement.querySelectorAll(
                '#qrText p'
            );
            const bodyQR = debugElement.nativeElement.querySelector('#qrBadge qr-code');
            const buttonText = debugElement.nativeElement.querySelector(
                '#nextWizardCode span'
            );
            const buttonIcon = debugElement.nativeElement.querySelector('#nextWizardCode svg-icon');
            const buttonMode = debugElement.nativeElement.querySelector('#qrMode');
            const buttonModeText = debugElement.nativeElement.querySelector(
                '#qrMode span'
            );

            const { wizardQR: wizardQRText } = templateText;

            expect(bodyText[0].textContent.trim()).toBe(wizardQRText.bodyText0);
            expect(bodyText[1].innerHTML)
                .toBe(staticLang.dialogs.twoFa.installAuthApp);
            expect(bodyQR).toBeDefined();

            expect(buttonText.textContent.trim()).toBe(wizardQRText.buttonText);
            expect(buttonIcon).toBeDefined();

            expect(buttonMode).toBeDefined();
            expect(buttonModeText.textContent.trim()).toBe(wizardQRText.buttonModeText);
        });

        it('should switch to PARAMS mode', async () => {
            const { component, debugElement, tick } = await setupTwoFaComponent();
            component.templateType = component.wizardQRTemplate;
            await tick();
            debugElement.nativeElement.querySelector('#qrMode').dispatchEvent(new MouseEvent('click'));
            expect(component.showQR).toBeFalsy();
        });

        it('should proceed to next step', async () => {
            const { debugElement, component, tick } = await setupTwoFaComponent();
            component.templateType = component.wizardQRTemplate;
            await tick();
            const nextStepSpy = jest.spyOn(component, 'next');
            debugElement.nativeElement.querySelector('#nextWizardCode')
                .dispatchEvent(new MouseEvent('click'));
            expect(nextStepSpy).toHaveBeenCalled();
        });
    });

    describe('when in CODE mode', () => {
        it('should have elements', async () => {
            const { debugElement, component, tick } = await setupTwoFaComponent();
            component.templateType = component.wizardCodeTemplate;
            await tick();
            const codeText = debugElement.nativeElement.querySelector('#codeText');
            const codeLabel = debugElement.nativeElement.querySelector(
                'div.modal-body form div.form-group label'
            );
            const codeInput = debugElement.nativeElement.querySelector(
                'div.modal-body form div.form-group input'
            );

            const { wizardCode: wizardCodeText } = templateText;

            expect(codeText.textContent.trim()).toBe(wizardCodeText.codeText);
            expect(codeLabel.textContent.trim()).toBe(wizardCodeText.codeLabel);
            expect(codeInput).toBeDefined();
        });

        it('should proceed to prev step', async () => {
            const { debugElement, component, tick } = await setupTwoFaComponent();
            component.templateType = component.wizardCodeTemplate;
            await tick();
            const prevStepSpy = jest.spyOn(component, 'prev');
            debugElement.nativeElement.querySelector('#previousWizardQR')
                .dispatchEvent(new MouseEvent('click'));
            expect(prevStepSpy).toHaveBeenCalled();
        });

        it('should proceed to next step', async () => {
            const { debugElement, component, tick } = await setupTwoFaComponent();
            component.templateType = component.wizardCodeTemplate;
            await tick();
            debugElement.nativeElement.querySelector('nx-process-button')
                .dispatchEvent(new MouseEvent('click'));
            expect(component.templateType === component.wizardFinishTemplate);
        });
    });

    describe('when in FINISH mode', () => {
        it('should have elements', async () => {
            const { debugElement, component, tick } = await setupTwoFaComponent();
            component.templateType = component.wizardFinishTemplate;
            component.newCodes = Array(8).fill('000000');
            await tick();
            const line1Text = debugElement.nativeElement.querySelector(
                'div.modal-body div.line1'
            );
            const line2Text = debugElement.nativeElement.querySelector(
                'div.modal-body .mt-3 p'
            );
            const codeLines = debugElement.nativeElement.querySelectorAll(
                '.code-area .code-area-code'
            );
            const buttonText = debugElement.nativeElement.querySelector(
                '#wizardDone span'
            );

            const { wizardFinish: wizardFinishText } = templateText;

            expect(line1Text.innerHTML)
                .toBe(staticLang.dialogs.twoFa.nowEnabled);
            expect(line2Text.textContent.trim()).toBe(wizardFinishText.line2);
            expect(codeLines.length).toBe(8);
            expect(buttonText.textContent.trim()).toBe(wizardFinishText.buttonText);
        });

        it('should proceed to next step', async () => {
            const { debugElement, component, tick } = await setupTwoFaComponent();
            component.templateType = component.wizardFinishTemplate;
            component.newCodes = Array(8).fill('000000');
            await tick();
            const nextStepSpy = jest.spyOn(component, 'next');
            debugElement.nativeElement.querySelector('#wizardDone')
                .dispatchEvent(new MouseEvent('click'));
            expect(nextStepSpy).toHaveBeenCalled();
        });
    });
});
