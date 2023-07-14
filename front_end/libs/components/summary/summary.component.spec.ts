import { setupComponent } from '../src/setup';

import { NxLicenseSummaryComponent } from './summary.component';

const setupRadioComponent = (): ReturnType<typeof setupComponent<NxLicenseSummaryComponent>> => {
    jest.spyOn(NxLicenseSummaryComponent.prototype, 'getLicenses').mockReturnValue();
    return setupComponent(NxLicenseSummaryComponent);
};

/**
 * TODO: These tests need to be rewritten.
 */
describe('Licenses (Summary)', () => {
    it('should create', async () => {
        const { component } = await setupRadioComponent();
        expect(component).toBeTruthy();
    });
});

/*
TODO: npm run fix: useRest is giving us issues in summary.component.ts

import { CommonModule } from '@angular/common';
import { DebugElement } from '@angular/core';
import {
    waitForAsync,
    ComponentFixture,
    TestBed,
    inject,
    fakeAsync,
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MockProvider } from 'ng-mocks';

import {
    NxContentBlockComponent
} from '@components/content-block/content-block.component';
import {
    NxContentBlockSectionComponent
} from '@components/content-block/section/section.component';
import { NxSettingsService } from '@pages/systems/settings/settings.service';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxSystem } from '@services/system.service/system';
import { setupTest50System, setupTest41System } from '@mocks/system.test';

import { NxLicenseSummaryComponent } from './summary.component';

describe('Licenses (Summary)', () => {
    let component: NxLicenseSummaryComponent;
    let fixture: ComponentFixture<NxLicenseSummaryComponent>;
    let el: DebugElement;

    let tile;
    let table;

    // let systemSpy: jasmine.SpyObj<NxSystem>;

    function executeSharedTests() {
        expect(Object.keys(component.licenses).length).toBeTruthy();
        fixture.detectChanges();

        expect(el.nativeElement.querySelectorAll('nx-block').length).toBe(1);

        // Have elements
        tile = el.nativeElement.querySelector('nx-block');
        table = tile.querySelector('table');

        // should display header
        const header = tile.querySelector('header h4');
        expect(header.innerHTML).toBe('Licenses Summary');

        // should display table with license summary
        expect(table).toBeTruthy();

        // should display license summary
        const rows = table.querySelector('tbody').querySelectorAll('tr');
        expect(rows.length).toBe(4);

        // should have 4 rows ... rows 1 and 4 are spacers
        const row1 = rows[1].querySelectorAll('td');
        expect(row1.length).toBe(5);
        expect(row1[0].innerHTML).toBe(component.licenses[0].type);
        expect(row1[1].innerHTML).toBe(component.licenses[0].count + '');
        expect(row1[2].innerHTML).toBe(component.licenses[0].countAvail + '');

        const row2 = rows[2].querySelectorAll('td');
        expect(row2.length).toBe(5);
        expect(row2[0].innerHTML).toBe(component.licenses[1].type);
        expect(row2[1].innerHTML).toBe(component.licenses[1].count + '');
        expect(row2[2].innerHTML).toBe(component.licenses[1].countAvail + '');
    }

    beforeEach(waitForAsync(() => {
        const spySystem = jasmine.createSpyObj('NxSystem', ['getLicenseSummaries']);

        TestBed.configureTestingModule({
            declarations: [
                NxLicenseSummaryComponent,
                NxContentBlockComponent,
                NxContentBlockSectionComponent
            ],
            imports: [
                CommonModule,
                FormsModule,
                TranslateModule.forRoot()
            ],
            providers: [
                MockProvider(NxLanguageProviderService),
                MockProvider(NxConfigService),
                MockProvider(NxSettingsService),
                { provide: NxSystem, useValue: spySystem }
            ]
        }).compileComponents()
            .then(() => {
                // systemSpy = TestBed.inject(NxSystem) as jasmine.SpyObj<NxSystem>;
                fixture = TestBed.createComponent(NxLicenseSummaryComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;

                component.CONFIG.licenseTypes = [
                    { name: 'time', title: 'Time', deactivationsAllowed: 3 }, {
                        name: 'trial',
                        title: 'Trial',
                        deactivationsAllowed: 0
                    }, { name: 'digital', title: 'Professional', deactivationsAllowed: 3 }, {
                        name: 'analog',
                        title: 'Analog',
                        deactivationsAllowed: 3
                    }, { name: 'edge', title: 'Edge', deactivationsAllowed: 3 }, {
                        name: 'vmax',
                        title: 'VMAX',
                        deactivationsAllowed: 3
                    }, {
                        name: 'videowall',
                        title: 'Video Wall',
                        deactivationsAllowed: 3
                    }, {
                        name: 'analogencoder',
                        title: 'Analog Encoder',
                        deactivationsAllowed: 3
                    }, { name: 'starter', title: 'Starter', deactivationsAllowed: 3 }, {
                        name: 'iomodule',
                        title: 'IO Module',
                        deactivationsAllowed: 3
                    }, { name: 'bridge', title: 'Bridge', deactivationsAllowed: 3 }, {
                        name: 'nvr',
                        title: 'NVR',
                        deactivationsAllowed: 0
                    }
                ];
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    /*
    TODO: npm run fix: useRest is giving us issues in summary.component.ts

    describe('Have no license keys summary', () => {
        beforeEach(() => {
            component.licenses = [];
            fixture.detectChanges();
        });

        it('should not render summary tile', () => {
            expect(el.nativeElement.querySelectorAll('nx-block').length).toBe(0);
        });
    });

    describe('Have license keys summary (LEGACY)', () => {
        beforeEach(inject([NxSettingsService], (settingsService: NxSettingsService) => {
            component.licensesLegacyInfo = [
                {
                    count: 12,
                    countAvail: 12,
                    required: 0,
                    type: 'NVR'
                },
                {
                    count: 12,
                    countAvail: 6,
                    required: 0,
                    type: 'Professional'
                }
            ];

            fixture.detectChanges();
            settingsService.systemSubject.next(setupTest41System());
        }));

        it('should render legacy info', inject([NxSettingsService], (settingsService: NxSettingsService) => {
            settingsService.systemSubject.subscribe(system => {
                executeSharedTests();
            });
        }));
    });

    describe('Have license keys summary (REST)', () => {
        beforeEach(inject([NxSettingsService], (settingsService: NxSettingsService) => {
            component.licensesLegacyInfo = [
                {
                    count: 12,
                    countAvail: 12,
                    required: 0,
                    type: 'NVR'
                },
                {
                    count: 12,
                    countAvail: 6,
                    required: 0,
                    type: 'Professional'
                }
            ];

            fixture.detectChanges();
            settingsService.systemSubject.next(setupTest50System());
        }));

        it('should render REST call info', fakeAsync(inject([NxSettingsService], (settingsService: NxSettingsService) => {
            systemSpy.getLicenseSummaries.and.resolveTo({
                digital: {
                    available: 20,
                    inUse: 2,
                    total: 20
                },
                starter: {
                    available: 10,
                    inUse: 0,
                    total: 10
                }
            });

            settingsService.systemSubject.subscribe(system => {
                systemSpy.getLicenseSummaries()
                    .then(response => {
                        component.setLicenses(response);
                    })
                    .finally(() => {
                        executeSharedTests();
                    });
            });
        })));
    });
});
*/
