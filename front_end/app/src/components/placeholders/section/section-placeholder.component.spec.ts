import {
    waitForAsync, ComponentFixture,
    TestBed,
    tick,
    fakeAsync
}                                        from '@angular/core/testing';
import { HttpClientTestingModule }       from '@angular/common/http/testing';
import { AngularSvgIconModule }          from 'angular-svg-icon';
import { NxSectionPlaceholderComponent } from './section-placeholder.component';
import { DebugElement }                  from '@angular/core';
import { NxLanguageProviderService }     from '@services/nx-language-provider';
import { NxConfigService }               from '@services/nx-config';
import { nxConfig }                      from '@services/nx-config/config';
import { getMockTranslations, MockProvider } from '@src/_mocks/helpers.test';

describe('NxSectionPlaceholderComponent', () => {
    let component: NxSectionPlaceholderComponent;
    let fixture: ComponentFixture<NxSectionPlaceholderComponent>;
    let el: DebugElement;

    const configMock = { getConfig: () => nxConfig };
    const langMock = getMockTranslations();

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports      : [AngularSvgIconModule.forRoot(), HttpClientTestingModule],
            declarations : [NxSectionPlaceholderComponent],
            providers    : [
                new MockProvider(NxConfigService, configMock),
                new MockProvider(NxLanguageProviderService, langMock)
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(NxSectionPlaceholderComponent);
        component = fixture.componentInstance;
        component.translatedMessage = 'Placeholder Title';
        el = fixture.debugElement;
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should have translatedMessage', () => {
        fixture.detectChanges();
        const span = fixture.nativeElement.querySelector('span');
        expect(span.innerHTML).toBe('Placeholder Title');
    });

    it('should have default svgFilename', () => {
        fixture.detectChanges();
        expect(component.svgFileName).toBe('system_settings_placeholder');
    });

    it('should set height', fakeAsync(() => {
        const height = '24';
        component.height = height;
        fixture.detectChanges();
        tick(5);
        expect(component.height).toBe(height);
    }));

    it('should set height default', () => {
        fixture.detectChanges();
        expect(component.height).toBe('64');
    });

    it('should set width', () => {
        const width = '24';
        component.width = width;
        fixture.detectChanges();
        expect(component.width).toBe(width);
    });

    it('should set width default', () => {
        fixture.detectChanges();
        expect(component.width).toBe('64');
    });
});
