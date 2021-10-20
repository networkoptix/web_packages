import {
    waitForAsync,
    ComponentFixture,
    TestBed
} from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { NxLicenseSummaryComponent } from './summary.component';
import { NxConfigService } from '@services/nx-config';
import { nxConfig } from '@services/nx-config/config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

describe('Licenses (Summary)', () => {
    let component: NxLicenseSummaryComponent;
    let fixture: ComponentFixture<NxLicenseSummaryComponent>;
    let el: DebugElement;

    const translateMock = {
        translations: {
            system: {
                status: {
                    unavailable: ''
                }
            },
            pageTitles: {
                // systems: () => "Systems"
            }
        }
    };
    const configMock = { getConfig: () => nxConfig };

    let tile;
    let table;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                NxLicenseSummaryComponent, NxContentBlockComponent,
                NxContentBlockSectionComponent
            ],
            imports: [
                CommonModule,
                FormsModule,
                TranslateModule.forRoot()
            ],
            providers: [
                { provide: NxLanguageProviderService, useValue: translateMock },
                { provide: NxConfigService, useValue: configMock }
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxLicenseSummaryComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should call getConfig', () => {
        expect(configMock.getConfig).toBeTruthy();
    });

    describe('Have no license keys summary', () => {
        beforeEach(() => {
            component.licenses = [];
            fixture.detectChanges();
        });

        it('should not render summary tile', () => {
            expect(fixture.debugElement.nativeElement.querySelectorAll('nx-block').length).toBe(0);
        });
    });

    describe('Have license keys summary', () => {
        beforeEach(() => {
            component.licenses = [
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
        });

        it('should render only one tile', () => {
            expect(fixture.debugElement.nativeElement.querySelectorAll('nx-block').length).toBe(1);
        });

        describe('Have elements', () => {
            beforeEach(() => {
                tile = fixture.debugElement.nativeElement.querySelector('nx-block');
                table = tile.querySelector('table');
            });

            it('should display header', () => {
                const header = tile.querySelector('header h4');
                expect(header.innerHTML).toBe('Licenses Summary');
            });

            it('should display table with license summary', () => {
                expect(table).toBeTruthy();
            });

            it('should display license summary', () => {
                const rows = table.querySelector('tbody').querySelectorAll('tr');
                expect(rows.length).toBe(4);

                // should have 4 rows ... row 1 and 4 are spacers
                const row1 = rows[1].querySelectorAll('td');
                expect(row1.length).toBe(4);
                expect(row1[0].innerHTML).toBe(component.licenses[0].type);
                expect(row1[1].innerHTML).toBe(component.licenses[0].count + '');
                expect(row1[2].innerHTML).toBe(component.licenses[0].countAvail + '');

                const row2 = rows[2].querySelectorAll('td');
                expect(row2.length).toBe(4);
                expect(row2[0].innerHTML).toBe(component.licenses[1].type);
                expect(row2[1].innerHTML).toBe(component.licenses[1].count + '');
                expect(row2[2].innerHTML).toBe(component.licenses[1].countAvail + '');
            });
        });
    });
});
