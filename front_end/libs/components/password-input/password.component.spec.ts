import { FormControl, FormGroup, NgModel } from '@angular/forms';
import { ngMocks } from 'ng-mocks';

import { NxPasswordComponent } from '@components/password-input/password.component';
import { nxConfig } from '@services/nx-config/config';
import { credentialsValidation } from '@static-variables';

import { setupComponent } from '../src/setup';

const setupPasswordComponent = (): ReturnType<typeof setupComponent<NxPasswordComponent>> => {
    nxConfig.commonPasswordsList = { 12345678: 1, test1234: 1 };
    NxPasswordComponent.prototype.component = { valid: true } as NgModel;
    return setupComponent(NxPasswordComponent, {
        form: { form: new FormGroup({ test: new FormControl('') }) },
        componentId: 'test',
    });
};

describe('NxPasswordComponent', () => {
    it('should create component and initialize commonPasswordsList', async () => {
        const { component } = await setupPasswordComponent();
        expect(component.CONFIG.commonPasswordsList).toEqual({ 12345678: 1, test1234: 1 });
        expect(component).toBeTruthy();
    });

    it('should have default properties', async () => {
        const { debugElement } = await setupPasswordComponent();
        const input = debugElement.nativeElement.querySelector('input');
        expect(input.autocomplete).toBe('new-password');
        expect(input.className).toContain('form-control');
        expect(input.pattern).toBe(credentialsValidation.passwordRequirements.requiredRegex);
    });

    it('should be in "password" mode', async () => {
        const { debugElement, component, fixture } = await setupPasswordComponent();
        component.passwordToggle = true;
        fixture.detectChanges();

        const toggle = fixture.debugElement.nativeElement.querySelectorAll(
            'span.input-group-addon svg-icon',
        );
        expect(toggle.length).toBe(1);
        expect(debugElement.nativeElement.querySelector('input').type).toBe('password');
    });

    it('should be in "text" mode', async () => {
        const { debugElement, component, fixture } = await setupPasswordComponent();
        component.passwordToggle = false;
        fixture.detectChanges(); // apply changes

        const toggle = fixture.debugElement.nativeElement.querySelectorAll(
            'span.input-group-addon svg-icon',
        );
        expect(toggle.length).toBe(1);
        expect(debugElement.nativeElement.querySelector('input').type).toBe('text');
    });

    it('should call setValue on keyup', async () => {
        const { debugElement, component, fixture } = await setupPasswordComponent();
        const spy = jest.spyOn(component, 'setValue');

        ngMocks.trigger(debugElement.nativeElement.querySelector('input'), 'keyup.1');
        fixture.detectChanges();
        await fixture.whenStable();
        expect(spy).toBeCalledTimes(1);
    });

    it('should check for common password (Fn test)', async () => {
        const { component } = await setupPasswordComponent();
        expect(component['checkCommon']('test1234')).toBe(1);
        expect(component['checkCommon']('TEST1234')).toBe(1);
    });

    it('should check for password complexity (Fn test)', async () => {
        const { component } = await setupPasswordComponent();
        expect(component['checkComplexity']('test')).toBe(1);
        expect(component['checkComplexity']('test1234')).toBe(2);
        expect(component['checkComplexity']('Test1234')).toBe(3);
        expect(component['checkComplexity']('Test1234!')).toBe(4);
    });
});
