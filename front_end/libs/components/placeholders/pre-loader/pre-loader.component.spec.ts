import { ComponentFixture } from '@angular/core/testing';

import { setupComponent } from '@components/src/setup';

import { NxPreLoaderComponent } from './pre-loader.component';

const setupRadioComponent = (): ReturnType<typeof setupComponent<NxPreLoaderComponent>> =>
    setupComponent(NxPreLoaderComponent);

describe('NxPreLoaderComponent', () => {
    it('should create', async () => {
        const { component } = await setupRadioComponent();
        expect(component).toBeTruthy();
    });

    describe('if type not defined', () => {
        it('should have wrapper class', async () => {
            const { debugElement } = await setupRadioComponent();
            const wrapper = debugElement.nativeElement.querySelectorAll('.placeholder-wrapper');
            expect(wrapper.length).toBe(1);
        });

        it('should have has-preloader', async () => {
            const { debugElement } = await setupRadioComponent();
            const preloader = debugElement.nativeElement.querySelectorAll(
                '.placeholder-wrapper .has-preloader',
            );
            expect(preloader.length).toBe(1);
            expect(preloader[0].className).toBe('placeholder has-preloader');
        });

        it('should have placeholder-content', async () => {
            const { debugElement } = await setupRadioComponent();
            const content = debugElement.nativeElement.querySelectorAll(
                '.placeholder-wrapper .has-preloader .placeholder-content',
            );
            expect(content.length).toBe(1);
            expect(content[0].className).toBe('placeholder-content');
        });

        it('should have placeholder-preloader', async () => {
            const { debugElement } = await setupRadioComponent();
            const content = debugElement.nativeElement.querySelectorAll(
                '.placeholder-wrapper .has-preloader .placeholder-content .placeholder-preloader',
            );
            expect(content.length).toBe(1);
        });

        it('should have 3 divs (dots)', async () => {
            const { debugElement } = await setupRadioComponent();
            const dots = debugElement.nativeElement.querySelectorAll(
                '.placeholder-preloader .circleG',
            );
            expect(dots.length).toBe(3);

            expect(dots[0].className).toBe('circleG circleG_1');
            expect(dots[1].className).toBe('circleG circleG_2');
            expect(dots[2].className).toBe('circleG circleG_3');
        });
    });

    describe('if type is defined', () => {
        const setAsPagePlaceholder = (fixture: ComponentFixture<NxPreLoaderComponent>): void => {
            fixture.componentInstance.type = 'page';
            fixture.detectChanges();
        };

        it('should not have wrapper class', async () => {
            const { debugElement, fixture } = await setupRadioComponent();
            setAsPagePlaceholder(fixture);
            const wrapper = debugElement.nativeElement.querySelectorAll('.placeholder-wrapper');
            expect(wrapper.length).toBe(0);
        });

        it('should have has-preloader and type', async () => {
            const { debugElement, fixture } = await setupRadioComponent();
            setAsPagePlaceholder(fixture);
            const preloader = debugElement.nativeElement.querySelectorAll('div .has-preloader');
            expect(preloader.length).toBe(1);
            expect(preloader[0].className).toBe('placeholder has-preloader page');
        });

        it('should have placeholder-content and type', async () => {
            const { debugElement, fixture } = await setupRadioComponent();
            setAsPagePlaceholder(fixture);
            const content = debugElement.nativeElement.querySelectorAll(
                'div .has-preloader .placeholder-content',
            );
            expect(content.length).toBe(1);
            expect(content[0].className).toBe('placeholder-content page');
        });
    });
});
