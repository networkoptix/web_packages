import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';

import { NxTourStepComponent } from '@components/tour-step/tour-step.component';

import { setupComponent } from '../setup';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
    it('should create the app', async () => {
        const { component } = await setupComponent(AppComponent, {}, [
            TourMatMenuModule.forRoot(),
            NxTourStepComponent,
        ]);

        expect(component).toBeTruthy();
    });
});
