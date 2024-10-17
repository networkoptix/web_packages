import { WizardModule } from '@setup-wizard/src/app/components/wizard.module';

import { setupComponent } from '../../../setup';

import { SystemNameComponent } from './system-name.component';

describe('SystemNameComponent', () => {
    it('should create', async () => {
        const { component } = await setupComponent(SystemNameComponent, {}, [WizardModule]);
        expect(component).toBeTruthy();
    });
});
