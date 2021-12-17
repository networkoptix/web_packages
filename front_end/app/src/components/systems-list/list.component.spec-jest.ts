import { Location }                  from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DebugElement } from '@angular/core';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { describe, expect, jest, beforeEach, it } from '@jest/globals';

import { NxAccountService } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { NxConfigService } from '@services/nx-config';
import { nxConfig } from '@services/nx-config/config';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { NxProcessService } from '@services/process.service';
import { NxSystemsService } from '@services/systems.service';
import { NxUriService } from '@services/uri.service';

import { NxSystemsListComponent } from './list.component';

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
