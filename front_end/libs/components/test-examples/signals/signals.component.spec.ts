import { v4 as uuid } from 'uuid';

import { setupComponent } from '@components/src/setup';

import { SignalsComponentExample } from './signals.component';

describe('SignalsComponentExample', () => {
    it('should create the component', async () => {
        const { debugElement } = await setupComponent(SignalsComponentExample);
        expect(debugElement.nativeElement).toBeDefined();
    });

    it('should run effects', async () => {
        const { component, debugElement, detectChanges } =
            await setupComponent(SignalsComponentExample);
        const updatedValue = uuid();
        component.state$$.set(updatedValue);

        detectChanges();

        expect(debugElement.nativeElement.querySelector('#state').textContent).toEqual(
            updatedValue,
        );
        expect(debugElement.nativeElement.querySelector('#sideEffect').textContent).toEqual(
            updatedValue,
        );
    });

    it('should calculate computed', async () => {
        const { component, debugElement, detectChanges } =
            await setupComponent(SignalsComponentExample);
        const updatedState = uuid();
        const updatedSeed = uuid();
        const expected = `${updatedState}${updatedSeed}`;
        component.state$$.set(updatedState);
        component.seed$$.set(updatedSeed);

        detectChanges();

        expect(component.computed$$()).toEqual(expected);
        expect(debugElement.nativeElement.querySelector('#computed').textContent).toEqual(expected);
    });
});
