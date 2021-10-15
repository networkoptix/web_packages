import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { Location }                  from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, jest, beforeEach, it } from '@jest/globals';

import { NxSystemsListComponent } from './list.component';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxConfigService } from '@services/nx-config';
import { nxConfig } from '@services/nx-config/config';
import { NxPageService } from '@services/page.service';
import { NxSystemsService } from '@services/systems.service';
import { NxAccountService } from '@services/account.service';
import { NxProcessService } from '@services/process.service';
import { NxUriService } from '@services/uri.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxMenusService } from '@services/menus.service';
import { Router } from '@angular/router';

describe('NxSystemsListComponent', () => {
    let component: NxSystemsListComponent;
    let fixture: ComponentFixture<NxSystemsListComponent>;
    let el: DebugElement;

    beforeEach(waitForAsync(() => {
        const translateSpy = {
            translations: {
                pageTitles: {
                    systems: () => 'Systems'
                }
            }
        };
        const configSpy = { getConfig: () => nxConfig };
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            declarations: [NxSystemsListComponent],
            providers: [
                { provide: NxLanguageProviderService, useValue: translateSpy },
                { provide: NxConfigService, useValue: configSpy },
                NxPageService,
                { provide: NxSystemsService, useValue: {} },
                { provide: NxAccountService, useValue: {} },
                { provide: NxProcessService, useValue: {} },
                { provide: NxUriService, useValue: {} },
                { provide: NxHeaderService, useValue: {} },
                { provide: NxMenusService, useValue: {} },
                { provide: Router, useValue: {} },
                Location
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxSystemsListComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    // it('should have 6 elements with no-data-panel-body class', () => {
    //     const spans = el.queryAll(By.css('.no-data-panel-body'));
    //     expect(spans.length).toBe(6);
    // })
});
