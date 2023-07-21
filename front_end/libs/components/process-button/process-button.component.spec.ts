import { DebugElement } from '@angular/core';

import { NxProcessService } from '@services/process.service';

import { setupComponent } from '../src/setup';

import { NxProcessButtonComponent } from './process-button.component';

const setupProcessButtonComponent = async (): ReturnType<
    typeof setupComponent<NxProcessButtonComponent>
> => {
    const setup = await setupComponent(NxProcessButtonComponent);
    setup.component.buttonText = 'Test';
    setup.component.clickFn = jest.fn();
    setup.component.process = setup.inject(NxProcessService).createProcess(() => Promise.resolve());
    setup.fixture.detectChanges();
    return setup;
};

const getButton = (el: DebugElement): HTMLButtonElement => el.nativeElement.querySelector('button');

describe('NxProcessButtonComponent', () => {
    it('should create NxProcessButtonComponent', async () => {
        const { component } = await setupProcessButtonComponent();
        expect(component).toBeTruthy();
    });

    it('should init component', async () => {
        const { component, debugElement } = await setupProcessButtonComponent();
        expect(component.buttonText).toBe('Test');
        expect(component.buttonClass).toBe('btn-primary');
        expect(component.buttonDisabled).toBeUndefined();
        expect(component.actionType).toBeUndefined();
        expect(component.form).toBeUndefined();
        expect(component.customClass).toBe('');
        expect(component.customButtonClass).toBe('');
        expect(component.svg).toBeUndefined();
        expect(component.textOnly).toBeFalsy();
        expect(component.reverseButton).toBeFalsy();
        expect(component.removeMinWidth).toBeFalsy();

        expect(getButton(debugElement).textContent).toBe('Test');
    });

    it('should indicate Process running after click', async () => {
        const { component, debugElement, fixture } = await setupProcessButtonComponent();
        const spy = jest.spyOn(component, 'clickHandler');
        getButton(debugElement).click();

        expect(spy).toBeCalledTimes(1);
        component.process.processing = true;
        fixture.detectChanges();

        const fakeButton = debugElement.nativeElement.querySelector('div div.loading');
        expect(fakeButton.classList.contains('disabled')).toBeTruthy();

        const dots = fakeButton.querySelectorAll('div span');
        expect(dots.length).toBe(3);
        expect(dots[0].className).toBe('dot1');
        expect(dots[1].className).toBe('dot2');
        expect(dots[2].className).toBe('dot3');
    });

    it('should have different layout if textOnly', async () => {
        const { component, debugElement, fixture } = await setupProcessButtonComponent();
        const spy = jest.spyOn(component, 'clickHandler');

        component.textOnly = true;
        fixture.detectChanges();

        const svgButton = debugElement.nativeElement.querySelector('.text-button svg-icon');
        expect(svgButton).toBeDefined();

        const textButton = debugElement.nativeElement.querySelector('.text-button a');
        expect(textButton.textContent).toBe('Open in %VMS_NAME%');
        textButton.click();
        expect(spy).toBeCalledTimes(1);
    });

    it('should display processing text in textOnly button', async () => {
        const { component, debugElement, fixture } = await setupProcessButtonComponent();
        component.textOnly = true;
        component.process.processing = true;
        fixture.detectChanges();
        const processText = debugElement.nativeElement.querySelector('.text-button span');
        expect(processText.textContent).toBe('Opening %VMS_NAME%...');
    });
});
