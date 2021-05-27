import {
    ComponentFixture, TestBed,
    waitForAsync, inject
}                              from '@angular/core/testing';
import { InfoBlockLine, InfoBlockSection, NxInfoBlockComponent } from './info-block.component';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';

describe('NxInfoBlockComponent', () => {
    let component: NxInfoBlockComponent;
    let fixture: ComponentFixture<NxInfoBlockComponent>;
    let el: HTMLElement;
    let LANG: LanguageI18NStaticTypes;

    const configMock = { getConfig: () => nxConfig };
    const translateMock = {
        translations: {
            common: {
                ip      : () => '10.1.5.100',
                os      : () => 'M$ Windows',
                version : () => '4.3.0.32989'
            }
        }
    };

    beforeEach(waitForAsync(() => {
        TestBed
            .configureTestingModule({
                declarations : [NxInfoBlockComponent],
                providers    : [
                    { provide: NxLanguageProviderService, useValue: translateMock },
                    { provide: NxConfigService, useValue: configMock }
                ]
            })
            .compileComponents().then(inject([NxLanguageProviderService], (service: NxLanguageProviderService) => {
                LANG = service.translations;
                fixture = TestBed.createComponent(NxInfoBlockComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement.nativeElement;

                component.sectionsOrColumns = [new InfoBlockSection([
                    new InfoBlockLine(LANG.common.ip(), '10.1.5.100' || '-'),
                    new InfoBlockLine(LANG.common.os(), 'M$ Windows' || '-'),
                    new InfoBlockLine(LANG.common.version(), '4.3.0.32989' || '-')
                ])];
                fixture.detectChanges();
            }));
    }));

    it('should create component', () => {
        expect(component).toBeTruthy();
    });

    describe('should have one block', () => {
        const block = el.querySelectorAll('.block .block-section');
        const lineKeys = el.querySelectorAll('.block .block-section .block-section-keys p');
        const lineValues = el.querySelectorAll('.block .block-section .block-section-values p');

        function testLineMinHeight(input) {
            it('should have min-height', () => {
                expect(input.css('min-height')).toBeDefined();
            });
        }

        it('and section', () => {
            expect(block.length).toBe(1);
        });

        it('and 3 lines(keys) in the section', () => {
            expect(lineKeys.length).toBe(3);
        });

        it('and 3 lines(values) in the section', () => {
            expect(lineValues.length).toBe(3);
        });

        for (let x = 0; x < lineKeys.length; x++) {
            testLineMinHeight(lineKeys[x]);
        }
    });
});
