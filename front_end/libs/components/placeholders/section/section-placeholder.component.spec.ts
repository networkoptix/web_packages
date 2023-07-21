import { setupComponent } from '@components/src/setup';

import { NxSectionPlaceholderComponent } from './section-placeholder.component';

const setupSectionPlaceholderComponent = async (): ReturnType<
    typeof setupComponent<NxSectionPlaceholderComponent>
> => {
    const setup = await setupComponent(NxSectionPlaceholderComponent);
    setup.component.translatedMessage = 'Placeholder Title';
    setup.fixture.detectChanges();
    return setup;
};

describe('NxSectionPlaceholderComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupSectionPlaceholderComponent();
        expect(component).toBeTruthy();
    });

    it('should have translatedMessage', async () => {
        const { debugElement } = await setupSectionPlaceholderComponent();
        const span = debugElement.nativeElement.querySelector('span');
        expect(span.textContent).toBe('Placeholder Title');
    });

    it('should have default svgFilename', async () => {
        const { component } = await setupSectionPlaceholderComponent();
        expect(component.svgFileName).toBe('system_settings_placeholder');
    });

    it('should set height', async () => {
        const { component, fixture } = await setupSectionPlaceholderComponent();
        const height = '24';
        component.height = height;
        fixture.detectChanges();
        expect(component.height).toBe(height);
    });

    it('should set height default', async () => {
        const { component } = await setupSectionPlaceholderComponent();
        expect(component.height).toBe('64');
    });

    it('should set width', async () => {
        const { component, fixture } = await setupSectionPlaceholderComponent();
        const width = '24';
        component.width = width;
        fixture.detectChanges();
        expect(component.width).toBe(width);
    });

    it('should set width default', async () => {
        const { component } = await setupSectionPlaceholderComponent();
        expect(component.width).toBe('64');
    });
});
