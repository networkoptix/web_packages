import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
// import { DebugElement } from '@angular/core';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MockProvider, MockDirective } from 'ng-mocks';
import { of } from 'rxjs';

import { NxMenuService } from '@app/menu/menu.service';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxToastService } from '@dialogs/toast.service';
import { NxAccountService } from '@services/account.service';
import { NxApplyService } from '@services/apply.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { NxUriService } from '@services/uri.service';

import { NxSystemStandardServerComponent } from './server-standard.component';
import type { DropdownStorage } from './server-standard.component.types';

describe('NxSystemStandardServerComponent', () => {
    let component: NxSystemStandardServerComponent;
    let fixture: ComponentFixture<NxSystemStandardServerComponent>;
    // let el: DebugElement;

    const translateMock = { translations: {} };
    const configMock = { getConfig: () => nxConfig };
    const routeMock = {
        queryParams: of({ state: undefined })
    };

    const dropdownsMock: DropdownStorage[] = [
        {
            name: 'storage1',
            id: 'storage1',
            isOnline: true,
            isUsedForWriting: true,
            isWritable: true,
            isNotSystem: true,
            freeSpace: 1,

            selected: false,
            value: '',
        },
        {
            name: 'storage2',
            id: 'storage2',
            isOnline: true,
            isUsedForWriting: true,
            isWritable: true,
            isNotSystem: true,
            freeSpace: 2,

            selected: false,
            value: '',
        },
        {
            name: 'storage3',
            id: 'storage3',
            isOnline: true,
            isUsedForWriting: true,
            isWritable: true,
            isNotSystem: true,
            freeSpace: 30,

            selected: false,
            value: '',
        },
        {
            name: 'storage4',
            id: 'storage4',
            isOnline: true,
            isUsedForWriting: true,
            isWritable: true,
            isNotSystem: true,
            freeSpace: 4,

            selected: false,
            value: '',
        },
        {
            name: 'storage5',
            id: 'storage5',
            isOnline: true,
            isUsedForWriting: true,
            isWritable: true,
            isNotSystem: true,
            freeSpace: 5,

            selected: false,
            value: '',
        }
    ];

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                NxSystemStandardServerComponent,
                MockDirective(RouterLink),
            ],
            imports: [CommonModule, HttpClientTestingModule],
            providers: [
                { provide: NxConfigService, useValue: configMock },
                { provide: NxLanguageProviderService, useValue: translateMock },
                { provide: NxAccountService, useValue: {} },
                { provide: ActivatedRoute, useValue: routeMock },
                MockProvider(NxApplyService),
                MockProvider(NxCloudApiService),
                MockProvider(NxProcessService),
                MockProvider(NxDialogsService),
                MockProvider(NxUriService),
                NxMenuService,
                NxToastService
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxSystemStandardServerComponent);
                component = fixture.componentInstance;
                // el = fixture.debugElement;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    describe('Selecting Default Storage', () => {
        beforeEach(() => {
            component.dropdownStorages = JSON.parse(
                JSON.stringify(dropdownsMock)
            ) as DropdownStorage[];
        });

        it('should pick only storage if only one storage in dropdown storages', () => {
            component.dropdownStorages = component.dropdownStorages.slice(1, 2);
            expect(component.selectDefaultStorage()).toEqual(dropdownsMock[1]);
        });

        it('should pick storage with the most free space if all NON-SYSTEM storages', () => {
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[2]);
        });

        it('should pick storage with most free space if all system storages', () => {
            component.dropdownStorages.forEach(store => { store.isNotSystem = false; });
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[2]);
        });

        it('should pick NON-SYSTEM storage if only one', () => {
            component.dropdownStorages.forEach(store => { store.isNotSystem = store.name === 'storage5'; });
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[4]);
        });

        it('should pick storage with the most free space if all storages USED FOR WRITING', () => {
            component.dropdownStorages[0].isNotSystem = false;
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[2]);
        });

        it('should pick storage with most free space if all storages NOT USED FOR WRITING', () => {
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].freeSpace = 40;
            component.dropdownStorages.forEach(store => { store.isUsedForWriting = false; });
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[1]);
        });

        it('should pick storage USED FOR WRITING if only one', () => {
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages.forEach(store => { store.isUsedForWriting = store.name === 'storage5'; });
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[4]);
        });

        it('should pick storage with the most free space if all storages are ONLINE', () => {
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].isUsedForWriting = false;
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[2]);
        });

        it('should pick storage with most free space if all storages ARE NOT ONLINE', () => {
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].isUsedForWriting = false;
            component.dropdownStorages[3].freeSpace = 40;
            component.dropdownStorages.forEach(store => { store.isOnline = false; });
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[3]);
        });

        it('should pick ONLINE storage if only one', () => {
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].isUsedForWriting = false;
            component.dropdownStorages.forEach(store => { store.isOnline = store.name === 'storage5'; });
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[4]);
        });

        it('should pick storage with the most free space if all storages are WRITABLE', () => {
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].isUsedForWriting = false;
            component.dropdownStorages[2].isOnline = false;
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[4]);
        });

        it('should pick storage with most free space if all storages are NOT WRITABLE', () => {
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].isUsedForWriting = false;
            component.dropdownStorages[2].isOnline = false;
            component.dropdownStorages[4].freeSpace = 40;
            component.dropdownStorages.forEach(store => { store.isWritable = false; });
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[4]);
        });

        it('should pick WRITABLE storage if only one', () => {
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].isUsedForWriting = false;
            component.dropdownStorages[2].isOnline = false;
            component.dropdownStorages.forEach(store => { store.isOnline = store.name === 'storage5'; });
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[4]);
        });
    });
});
