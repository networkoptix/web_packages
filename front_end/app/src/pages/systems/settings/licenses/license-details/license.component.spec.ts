import { CommonModule, DatePipe } from '@angular/common';
// import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MockProvider } from 'ng-mocks';

import {
    NxContentBlockComponent
} from '@components/content-block/content-block.component';
import {
    NxContentBlockSectionComponent
} from '@components/content-block/section/section.component';
import {
    NxInfoBlockComponent
} from '@components/info-block/info-block.component';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxSystem } from '@services/system.service/system';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxLicenseDetailComponent } from './license.component';

describe('Licenses (Details)', () => {
    let component: NxLicenseDetailComponent;
    let fixture: ComponentFixture<NxLicenseDetailComponent>;
    // let el: DebugElement;

    const systemMock = {};

    let tile;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                NxLicenseDetailComponent,
                NxContentBlockComponent,
                NxContentBlockSectionComponent,
                NxInfoBlockComponent
            ],
            imports: [
                CommonModule,
                FormsModule,
                PipesModule,
                TranslateModule.forRoot()
            ],
            providers: [
                MockProvider(NxLanguageProviderService),
                MockProvider(NxConfigService),
                { provide: NxSystem, useValue: systemMock },
                { provide: DatePipe, useValue: {} }
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxLicenseDetailComponent);
                component = fixture.componentInstance;
                // el = fixture.debugElement;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should call formatLicenseKey and get formatted key', () => {
        const key = (component as any).formatLicenseKey('0000000000000000');
        expect(key).toBe('0000-0000-0000-0000');
    });

    describe('Have registered license key', () => {
        beforeEach(() => {
            component.licenses = [{
                info: {
                    brand: 'hdwitness',
                    class: 'nvr',
                    company: 'TestNVR',
                    count: '4',
                    deactivations: '0',
                    expiration: '',
                    expired: false,
                    hwid: '052f25774269474ec8f9454d92ca9511cf',
                    inuse: '',
                    name: 'hdwitness',
                    required: 0,
                    serial: '0000-0000-0000-0000',
                    serverName: 'Server Sofia',
                    serverStatus: 'Online',
                    serverTime: 1614116391263,
                    signature2: 'Zd8Ulv0b6nsJrcMnAkS9R54eFVptZl3NN1Kpt2ycdAGCCy/Tbgk2Pix3jSkz/hNqPcrEDpIO+SqKIgjGdEMA9A1XAelHdf61QDamuk48ePhwl3SbZ31wcSh9YyW8c0LNsx6GB07C/9zkDT2aE3lIUMYuEym0ZjfhPiPhu40eEvyx1504VMydkPdge2pz/T3HVOXJ/0UJwPm8YJNkwrxHpYRRVHvMGTKU9JuC/g2IaivIGYKDPk4YUePVsdE64iKXb2hImBS1C6vu88CxHA21prsQ9/J7WgG4zddgktI7HHzSJ4ywDSBj2IsTGFe3KdMGrxi/CCSL4pegtqe+imbZVQ',
                    status: 'OK',
                    support: 'nvr@qa.com',
                    version: '4.3.0.683'
                },
                key: '0000-0000-0000-0000',
                licenseBlock: 'NAME=hdwitness↵SERIAL=D9RR-LV9X-E59W-QI6A↵HWID=052f25774269474ec8f9454d92ca9511cf↵COUNT=4↵CLASS=nvr↵VERSION=4.3.0.683↵BRAND=hdwitness↵EXPIRATION=↵SIGNATURE2=Zd8Ulv0b6nsJrcMnAkS9R54eFVptZl3NN1Kpt2ycdAGCCy/Tbgk2Pix3jSkz/hNqPcrEDpIO+SqKIgjGdEMA9A1XAelHdf61QDamuk48ePhwl3SbZ31wcSh9YyW8c0LNsx6GB07C/9zkDT2aE3lIUMYuEym0ZjfhPiPhu40eEvyx1504VMydkPdge2pz/T3HVOXJ/0UJwPm8YJNkwrxHpYRRVHvMGTKU9JuC/g2IaivIGYKDPk4YUePVsdE64iKXb2hImBS1C6vu88CxHA21prsQ9/J7WgG4zddgktI7HHzSJ4ywDSBj2IsTGFe3KdMGrxi/CCSL4pegtqe+imbZVQ==↵COMPANY=TestNVR↵SUPPORT=nvr@qa.com↵DEACTIVATIONS=0↵'
            }];
            component.LANG.license = {
                info: {
                    channels: () => 'Channels',
                    deactivations: () => 'Deactivation left',
                    error: () => 'Error',
                    expired: () => 'Expired',
                    expires: () => 'Expires',
                    hwid: () => 'Hardware ID',
                    nvrError: () => 'NVR Error',
                    ok: () => 'OK',
                    online: () => 'Online',
                    server: () => 'Server',
                    serverNotFound: () => 'Server not found',
                    status: () => 'Status',
                    type: () => 'Type'
                },
                licenseTypeTitles: {
                    Analog: () => 'Analog',
                    'Analog Encoder': () => 'Analog Encoder',
                    Bridge: () => 'Bridge',
                    Edge: () => 'Edge',
                    'IO Module': () => 'IO Module',
                    NVR: () => 'NVR',
                    Professional: () => 'Professional',
                    Starter: () => 'Starter',
                    Time: () => 'Time',
                    Trial: () => 'Trial',
                    VMAX: () => 'VMAX',
                    'Video Wall': () => 'Video Wall',
                    Invalid: () => 'Invalid',
                },
                messages: {
                    activated: () => 'License key activated',
                    inuse: () => 'License key has already been activated and bound to server with hardware ID {hwid} in another system',
                    required: () => '{number} more required',
                    trialActivated: () => 'Trial license activated. Starting today, you can record up to 4 cameras for 30 days.'
                }
            };
            component.CONFIG.licenseTypes = [
                {
                    name: 'time',
                    title: 'Time',
                    deactivationsAllowed: 3
                },
                {
                    name: 'trial',
                    title: 'Trial',
                    deactivationsAllowed: 0
                },
                {
                    name: 'digital',
                    title: 'Professional',
                    deactivationsAllowed: 3
                },
                {
                    name: 'analog',
                    title: 'Analog',
                    deactivationsAllowed: 3
                },
                {
                    name: 'edge',
                    title: 'Edge',
                    deactivationsAllowed: 3
                },
                {
                    name: 'vmax',
                    title: 'VMAX',
                    deactivationsAllowed: 3
                },
                {
                    name: 'videowall',
                    title: 'Video Wall',
                    deactivationsAllowed: 3
                },
                {
                    name: 'analogencoder',
                    title: 'Analog Encoder',
                    deactivationsAllowed: 3
                },
                {
                    name: 'starter',
                    title: 'Starter',
                    deactivationsAllowed: 3
                },
                {
                    name: 'iomodule',
                    title: 'IO Module',
                    deactivationsAllowed: 3
                },
                {
                    name: 'bridge',
                    title: 'Bridge',
                    deactivationsAllowed: 3
                },
                {
                    name: 'nvr',
                    title: 'NVR',
                    deactivationsAllowed: 0
                }
            ];
            (component as any).orderedDetails(component.licenses[0].info);

            fixture.detectChanges();
        });

        it('should render only one tile', () => {
            expect(fixture.debugElement.nativeElement.querySelectorAll('nx-block').length).toBe(1);
        });

        describe('Have elements', () => {
            beforeEach(() => {
                tile = fixture.debugElement.nativeElement.querySelector('nx-block');
            });

            it('should have proper type', () => {
                expect(tile.getAttribute('type')).toBe('gray');
            });

            it('should display license key in header', () => {
                const header = tile.querySelector('header h4');
                expect(header.innerHTML).toBe(component.licenses[0].key);
            });

            it('should display license key properties', () => {
                const properties = tile.querySelector('div.block-section-values').querySelectorAll('p');

                // Last item "Deactivations should be hidden
                expect(properties.length).toBe(7);

                // ? value for class is empty
                // expect(properties[0].innerHTML.replace(/<!--((.|[\r\n|\r|\n])*?)-->/g, '').trim())
                // .toBe(component.licenses[0].info.class);
                expect(properties[1].innerHTML.replace(/<!--((.|[\r\n|\r|\n])*?)-->/g, '').trim())
                    .toBe(component.licenses[0].info.count);
                expect(properties[2].innerHTML.replace(/<!--((.|[\r\n|\r|\n])*?)-->/g, '').trim())
                    .toBe(component.licenses[0].info.serverName);
                expect(properties[3].innerHTML.replace(/<!--((.|[\r\n|\r|\n])*?)-->/g, '').trim())
                    .toBe(component.licenses[0].info.hwid);
                expect(properties[4].innerHTML.replace(/<!--((.|[\r\n|\r|\n])*?)-->/g, '').trim())
                    .toBe(component.licenses[0].info.status);
                expect(properties[5].innerHTML.replace(/<!--((.|[\r\n|\r|\n])*?)-->/g, '').trim())
                    .toBe('-');

                expect(properties[6].innerHTML.replace(/<!--((.|[\r\n|\r|\n])*?)-->/g, '').trim())
                    .toBe(component.licenses[0].info.deactivations);
                expect(properties[6].getAttribute('style')).toBe('display: none;');
            });
        });
    });
});
