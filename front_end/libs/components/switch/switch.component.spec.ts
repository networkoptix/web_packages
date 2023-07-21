import { DebugElement } from '@angular/core';

import { setupComponent } from '../src/setup';

import { NxSwitchComponent } from './switch.component';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const getElementRefs = (el: DebugElement) => {
    const body = el.nativeElement.querySelector('div') as HTMLDivElement;
    const label = el.nativeElement.querySelector('h4.switch-label') as HTMLHeadingElement;
    const input = el.nativeElement.querySelector(
        'div.switch .switch-element input',
    ) as HTMLInputElement;
    const span = el.nativeElement.querySelector(
        'div.switch .switch-element span',
    ) as HTMLSpanElement;
    const elemBar = el.nativeElement.querySelector('div.switch .bar') as HTMLDivElement;
    const elemCircle = el.nativeElement.querySelector('div.switch .circle') as HTMLDivElement;
    return {
        body,
        label,
        input,
        span,
        elemBar,
        elemCircle,
    };
};

const setupSwitchComponent = async (): ReturnType<typeof setupComponent<NxSwitchComponent>> => {
    const setup = await setupComponent(NxSwitchComponent);
    setup.component.id = 'testId';
    setup.component.label = 'Test label';

    setup.fixture.detectChanges();

    return setup;
};

describe('NxSwitchComponent', () => {
    it('should create component', async () => {
        const { component } = await setupSwitchComponent();
        expect(component).toBeTruthy();
    });

    it('should init component (DEFAULT)', async () => {
        const { component, debugElement } = await setupSwitchComponent();
        const { body, label, input, span, elemBar, elemCircle } = getElementRefs(debugElement);
        expect(body.id).toBe(component.componentId + '-wrapper');
        expect(label.textContent.trim()).toBe('Test label');
        expect(input.getAttribute('type')).toBe('checkbox');
        expect(input.id).toBe(component.componentId);
        expect(span.classList.contains('slider')).toBeTruthy();
        expect(elemBar).toBeDefined();
        expect(elemCircle).toBeDefined();
    });

    it('should change value and emit event', async () => {
        const { component, debugElement } = await setupSwitchComponent();
        const { body } = getElementRefs(debugElement);
        jest.spyOn(component.onSwitch, 'emit');
        expect(component['value']).toBeFalsy();

        body.click();
        expect(component['value']).toBeTruthy();
        expect(component.onSwitch.emit).toHaveBeenCalledWith(true);
    });

    it('should not change value if disabled', async () => {
        const { component, debugElement } = await setupSwitchComponent();
        const { body } = getElementRefs(debugElement);
        jest.spyOn(component.onSwitch, 'emit');
        component.disabled = true;

        body.click();
        expect(component['value']).toBeFalsy();
        expect(component.onSwitch.emit).toHaveBeenCalledWith(undefined);
    });

    it('should change state (NgModel)', async () => {
        const { component } = await setupSwitchComponent();
        component.writeValue(true);
        expect(component['value']).toBeTruthy();
    });

    it('should not change value if disabled (NgModel)', async () => {
        const { component } = await setupSwitchComponent();
        component.disabled = true;
        component.writeValue(true);
        expect(component['value']).toBeFalsy();
    });
});
