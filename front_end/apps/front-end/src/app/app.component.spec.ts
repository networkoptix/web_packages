import { setupComponent } from '../setup';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
    it('should create the app', async () => {
        const { component } = await setupComponent(AppComponent);

        expect(component).toBeTruthy();
    });
});
