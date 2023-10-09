import { setupComponent } from '@pages/src/setup';

import { NxSettingsStateComponent } from './state.component';
// import { State } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

describe('Organizations & Subchannels settings', () => {
    let comp: NxSettingsStateComponent;

    beforeEach(async () => {
        const { component } = await setupComponent(NxSettingsStateComponent);
        comp = component;
    });

    it('should load the component', async () => {
        expect(comp).toBeTruthy();
    });

    it('should render on load selected button correctly from input', () => {
        // component.currState = State.Active;
    });

    it('should render warning for restricted orgs/subchannels', () => {});

    it('should change description block according to updated state', () => {});

    it('should not select a button if passed in state is undefined', () => {});
});
