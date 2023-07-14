import { setupComponent } from '@components/src/setup';

import { NxPlayerPlaceholderComponent } from './player-placeholder.component';

const setupPlayerPlaceholderComponent = async (): ReturnType<typeof setupComponent<NxPlayerPlaceholderComponent>> => {
    NxPlayerPlaceholderComponent.prototype.description = '';
    const setup = await setupComponent(NxPlayerPlaceholderComponent);
    setup.component.heading = 'ERROR';
    setup.component.description = 'Some error';
    setup.component.svgFileName = 'placeholder_camera_offline';
    setup.fixture.detectChanges();
    return setup;
};

describe('NxPlayerPlaceholderComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupPlayerPlaceholderComponent();
        expect(component).toBeTruthy();
    });

    it('should init element', async () => {
        const { debugElement } = await setupPlayerPlaceholderComponent();
        const heading = debugElement.nativeElement.querySelector('.heading');
        const description = debugElement.nativeElement.querySelector('.description');
        expect(heading.textContent.trim()).toBe('ERROR');
        expect(description.textContent.trim()).toBe('Some error');
    });

    it('should set height', async () => {
        const { component, fixture } = await setupPlayerPlaceholderComponent();
        const height = '64';
        component.height = height;
        fixture.detectChanges();
        expect(component.height).toBe(height);
    });

    it('should set height default', async () => {
        const { component } = await setupPlayerPlaceholderComponent();
        expect(component.height).toBe('96');
    });
});
