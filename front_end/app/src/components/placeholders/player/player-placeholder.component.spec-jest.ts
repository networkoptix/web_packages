import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, jest } from '@jest/globals';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AngularSvgIconModule }               from 'angular-svg-icon';

import { NxSectionPlaceholderComponent } from './section-placeholder.component';
import { DebugElement } from '@angular/core';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxConfigService } from '@services/nx-config';

describe('NxSectionPlaceholderComponent', () => {
    let component: NxSectionPlaceholderComponent;
    let fixture: ComponentFixture<NxSectionPlaceholderComponent>;
    let el: DebugElement;

    beforeEach(async(() => {
        const translateSpy = { translate: jest.fn() };
        const configSpy = {
            getConfig: jest.fn(() => {
                return {
                    icons: {
                        dirSectionPlaceholder: '/static/images/placeholders/section/'
                    }
                };
            })
        };
        TestBed.configureTestingModule({
            imports      : [AngularSvgIconModule.forRoot(), HttpClientTestingModule],
            declarations : [NxSectionPlaceholderComponent],
            providers    : [
                { provide: NxLanguageProviderService, useValue: translateSpy },
                { provide: NxConfigService, useValue: configSpy }
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxSectionPlaceholderComponent);
                component = fixture.componentInstance;
                component.translatedMessage = 'Placeholder Title';
                el = fixture.debugElement;
            })
            .catch(err => console.error(err));
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

    it('should set height', () => {
        const height = '24';
        component.height = height;
        fixture.detectChanges();
        expect(component.height).toBe(height);
    });

    it('should set height default', () => {
        fixture.detectChanges();
        expect(component.height).toBe('64');
    });
});
