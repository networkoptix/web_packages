import {
    ComponentFixture,
    TestBed,
    waitForAsync,
    inject,
    fakeAsync,
    tick
} from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';

import { PipesModule } from '@app/pipes/pipes.module';
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { NxInfoBlockComponent } from './info-block.component';
import { InfoBlockLine, InfoBlockSection } from './info-block.component.types';

describe('NxInfoBlockComponent', () => {
    let component: NxInfoBlockComponent;
    let fixture: ComponentFixture<NxInfoBlockComponent>;
    let el: HTMLElement;
    let LANG: LanguageI18NStaticTypes;

    beforeEach(waitForAsync(() => {
        TestBed
            .configureTestingModule({
                imports: [PipesModule],
                declarations: [NxInfoBlockComponent],
                providers: [
                    MockProvider(NxLanguageProviderService),
                    MockProvider(NxConfigService)
                ]
            })
            .compileComponents().then(inject([NxLanguageProviderService],
                (service: NxLanguageProviderService) => {
                    LANG = service.translations;
                    fixture = TestBed.createComponent(NxInfoBlockComponent);
                    component = fixture.componentInstance;
                    el = fixture.debugElement.nativeElement;

                    component.sectionsOrColumns = [new InfoBlockSection([
                        new InfoBlockLine(LANG.common.ip(), '10.1.5.100'),
                        new InfoBlockLine(LANG.common.os(), 'M$ Windows'),
                        new InfoBlockLine(LANG.common.version(), '4.3.0.32989')
                    ])];
                    fixture.detectChanges();
                })
            );
    }));

    it('should create component', () => {
        expect(component).toBeTruthy();
    });

    describe('should have one block', () => {
        it('and section', () => {
            const block = el.querySelectorAll('.block .block-section');
            expect(block.length).toBe(1);
        });

        it('and 3 lines(keys) in the section with min-height set', fakeAsync(() => {
            const lineKeys = el.querySelectorAll<HTMLParagraphElement>(
                '.block .block-section .block-section-keys p'
            );
            expect(lineKeys.length).toBe(3);

            component.check(0, 0, el);
            tick();
            fixture.detectChanges();

            fixture.whenStable().then(() => {
                expect(lineKeys[0].style.minHeight).toBe('16px');
                expect(lineKeys[1].style.minHeight).toBe('16px');
                expect(lineKeys[2].style.minHeight).toBe('16px');
            });
        }));

        it('and 3 lines(values) in the section with min-height set', fakeAsync(() => {
            const lineValues = el.querySelectorAll<HTMLParagraphElement>(
                '.block .block-section .block-section-values p'
            );
            expect(lineValues.length).toBe(3);

            component.check(0, 0, el);
            tick();
            fixture.detectChanges();

            fixture.whenStable().then(() => {
                expect(lineValues[0].style.minHeight).toBe('16px');
                expect(lineValues[1].style.minHeight).toBe('16px');
                expect(lineValues[2].style.minHeight).toBe('16px');
            });
        }));
    });
});
