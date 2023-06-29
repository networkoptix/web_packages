import { setupComponent } from '../src/setup';

import { NxRadioComponent } from './radio.component';

const setupRadioComponent = (): ReturnType<typeof setupComponent<NxRadioComponent>> => setupComponent(NxRadioComponent);

describe('NxRadioComponent', () => {
    it('should create', async () => {
        const { component } = await setupRadioComponent();
        expect(component).toBeTruthy();
    });

    it('should have defined states', async () => {
        const { component } = await setupRadioComponent();
        expect(component['_rbxStates']).toEqual({
            rbFalse: 'unchecked',
            rbTrue: 'checked',
            rbDisabled: 'disabled',
            rbOrElse: 'tristate'
        });
    });

    it('should initialize default state', async () => {
        const { component } = await setupRadioComponent();
        expect(component.state).toBe(component['_rbxStates'].rbFalse);
    });

    it('should set state on @Input(change) change to true', async () => {
        const { component, fixture } = await setupRadioComponent();
        component.value = 'Beer!';
        const emitValue = new Promise(resolve => component.onClick.subscribe(resolve));
        component.changeState();
        fixture.detectChanges();
        expect(await emitValue).toBe('Beer!');
        expect(component.state).toBe(component['_rbxStates'].rbTrue);
    });
});
