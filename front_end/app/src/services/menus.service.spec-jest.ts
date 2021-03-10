import { waitForAsync, TestBed }                   from '@angular/core/testing';
import { describe, expect, jest, beforeEach, it }  from '@jest/globals';
import { TranslateService }                        from '@ngx-translate/core';
import { Subject }                                 from 'rxjs';

import { NxMenusService }            from '@services/menus.service';
import { NxConfigService }           from '@services/nx-config';
import { nxConfig }                  from '@services/nx-config/config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxSessionService }          from './session.service';
import { WINDOW }                    from './window-provider';

describe('Test Suite Name', () => {
    let menu: NxMenusService;

    const translateMock = {
        translations     : {},
        translateSubject : new Subject()
    };
    const configMock = { getConfig: () => nxConfig };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            providers: [
                NxMenusService,
                { provide: NxLanguageProviderService, useValue: translateMock },
                { provide: NxConfigService, useValue: configMock },
                { provide: TranslateService, useValue: {} },
                { provide: NxSessionService, useValue: {} },
                { provide: WINDOW, useValue: {} }
            ]
        });
        menu = TestBed.inject(NxMenusService);
    }));

    it('should create the component', () => {
        expect(menu).toBeTruthy();
    });
});
