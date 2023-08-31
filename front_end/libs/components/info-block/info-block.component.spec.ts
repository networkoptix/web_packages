import staticLang from '@language_static';

import { setupComponent } from '../src/setup';

import { NxInfoBlockComponent } from './info-block.component';
import { InfoBlockSection, InfoBlockLine } from './info-block.component.types';

const setupInfoBlockComponent = (): ReturnType<typeof setupComponent<NxInfoBlockComponent>> => {
    NxInfoBlockComponent.prototype.sectionsOrColumns = [
        new InfoBlockSection([
            new InfoBlockLine(staticLang.common.ip, '10.1.5.100'),
            new InfoBlockLine(staticLang.common.os, 'M$ Windows'),
            new InfoBlockLine(staticLang.common.version, '4.3.0.32989'),
        ]),
    ];

    return setupComponent(NxInfoBlockComponent);
};

describe('NxInfoBlockComponent', () => {
    it('should create component', async () => {
        const { component } = await setupInfoBlockComponent();
        expect(component).toBeTruthy();
    });

    describe('should have one block', () => {
        it('and section', async () => {
            const { debugElement } = await setupInfoBlockComponent();
            const block = debugElement.nativeElement.querySelectorAll('.block .block-section');
            expect(block.length).toBe(1);
        });

        it('and 3 lines(keys) in the section with min-height set', async () => {
            const { debugElement, component, fixture } = await setupInfoBlockComponent();
            const lineKeys = debugElement.nativeElement.querySelectorAll(
                '.block .block-section .block-section-keys p',
            );
            expect(lineKeys.length).toBe(3);

            await component.check(
                0,
                0,
                debugElement.nativeElement.querySelector('.block-section.mw-100.w-100'),
            );
            fixture.detectChanges();

            expect(lineKeys[0].style.minHeight).toBe('16px');
            expect(lineKeys[1].style.minHeight).toBe('16px');
            expect(lineKeys[2].style.minHeight).toBe('16px');
        });

        it('and 3 lines(values) in the section with min-height set', async () => {
            const { debugElement, component, fixture } = await setupInfoBlockComponent();
            const lineValues = debugElement.nativeElement.querySelectorAll(
                '.block .block-section .block-section-values p',
            );
            expect(lineValues.length).toBe(3);

            await component.check(0, 0, debugElement.nativeElement);
            fixture.detectChanges();

            expect(lineValues[0].style.minHeight).toBe('16px');
            expect(lineValues[1].style.minHeight).toBe('16px');
            expect(lineValues[2].style.minHeight).toBe('16px');
        });
    });
});
