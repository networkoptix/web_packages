import { HttpClientTestingModule }                 from '@angular/common/http/testing';
import { DebugElement }                            from '@angular/core';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { By }                                      from '@angular/platform-browser';
import { describe, expect, jest, beforeEach, it }  from '@jest/globals';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService }             from '@services/page.service';

import { NxNoSystemsComponent }      from './no-systems.component';

describe('NxNoSystemsComponent', () => {
    let component: NxNoSystemsComponent;
    let fixture: ComponentFixture<NxNoSystemsComponent>;
    let el: DebugElement;

    beforeEach(waitForAsync(() => {
        const translateSpy = {
            translations: {
                pageTitles: {
                    systems: () => 'Systems'
                }
            }
        };
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            declarations: [NxNoSystemsComponent],
            providers: [
                { provide: NxLanguageProviderService, useValue: translateSpy },
                { provide: NxPageService }
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxNoSystemsComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should have 6 elements with no-data-panel-body class', () => {
        const spans = el.queryAll(By.css('.no-data-panel-body'));
        expect(spans.length).toBe(6);
    });
});
