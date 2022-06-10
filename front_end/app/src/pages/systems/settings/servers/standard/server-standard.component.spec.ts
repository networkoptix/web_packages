import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DebugElement } from '@angular/core';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxToastService } from '@dialogs/toast.service';
import { NxAccountService } from '@services/account.service';
import { NxApplyService } from '@services/apply.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxConfigService } from '@services/nx-config';
import { nxConfig } from '@services/nx-config/config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { NxUriService } from '@services/uri.service';
import { RouterLinkDirectiveStub } from '@src/_testing';
import { NxMenuService } from '@src/menu';

import { NxSystemStandardServerComponent } from './server-standard.component';

describe('NxSystemStandardServerComponent', () => {
    let component: NxSystemStandardServerComponent;
    let fixture: ComponentFixture<NxSystemStandardServerComponent>;
    let el: DebugElement;

    const translateMock = { translations: {} };
    const configMock = { getConfig: () => nxConfig };
    const routeMock = {
        queryParams: of({ state: undefined })
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [NxSystemStandardServerComponent, RouterLinkDirectiveStub],
            imports: [CommonModule, HttpClientTestingModule],
            providers: [
                { provide: NxConfigService, useValue: configMock },
                { provide: NxLanguageProviderService, useValue: translateMock },
                NxApplyService,
                { provide: NxAccountService, useValue: {} },
                { provide: NxCloudApiService, useValue: {} },
                { provide: NxProcessService, useValue: {} },
                { provide: ActivatedRoute, useValue: routeMock },
                { provide: NxDialogsService, useValue: {} },
                NxMenuService,
                { provide: NxUriService, useValue: {} },
                NxToastService
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxSystemStandardServerComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    describe('Selecting Default Storage', () => {
        beforeEach(() => {
            component.dropdownStorages = [
                {
                    name: 'storage1',
                    isOnline: true,
                    isUsedForWriting: true,
                    isWritable: true,
                    isNotSystem: true,
                    freeSpace: 1
                },
                {
                    name: 'storage2',
                    isOnline: true,
                    isUsedForWriting: true,
                    isWritable: true,
                    isNotSystem: true,
                    freeSpace: 2
                },
                {
                    name: 'storage3',
                    isOnline: true,
                    isUsedForWriting: true,
                    isWritable: true,
                    isNotSystem: true,
                    freeSpace: 30
                },
                {
                    name: 'storage4',
                    isOnline: true,
                    isUsedForWriting: true,
                    isWritable: true,
                    isNotSystem: true,
                    freeSpace: 4
                },
                {
                    name: 'storage5',
                    isOnline: true,
                    isUsedForWriting: true,
                    isWritable: true,
                    isNotSystem: true,
                    freeSpace: 5
                }
            ];
        });

        it('should pick only storage if only one storage in dropdown storages', () => {
            component.dropdownStorages = component.dropdownStorages.slice(1, 2);
            expect(component.selectDefaultStorage()).toEqual({
                name: 'storage2',
                isOnline: true,
                isUsedForWriting: true,
                isWritable: true,
                isNotSystem: true,
                freeSpace: 2
            });
        });

        it('should pick storage with the most free space if all NON-SYSTEM storages', () => {
            expect(component.selectDefaultStorage()).toEqual({
                name: 'storage3',
                isOnline: true,
                isUsedForWriting: true,
                isWritable: true,
                isNotSystem: true,
                freeSpace: 30
            });
        });

        it('should pick storage with most free space if all system storages', () => {
            component.dropdownStorages.forEach(store =>  { store.isNotSystem = false; });
            expect(component.selectDefaultStorage()).toEqual({
                name: 'storage3',
                isOnline: true,
                isUsedForWriting: true,
                isWritable: true,
                isNotSystem: false,
                freeSpace: 30
            });
        });

        it('should pick NON-SYSTEM storage if only one', () => {
            component.dropdownStorages.forEach(store => { store.isNotSystem = store.name === 'storage5'; });
            expect(component.selectDefaultStorage()).toEqual({
                name: 'storage5',
                isOnline: true,
                isUsedForWriting: true,
                isWritable: true,
                isNotSystem: true,
                freeSpace: 5
            });
        });

        it('should pick storage with the most free space if all storages USED FOR WRITING', () => {
            component.dropdownStorages[0].isNotSystem = false;
            expect(component.selectDefaultStorage()).toEqual({
                name: 'storage3',
                isOnline: true,
                isUsedForWriting: true,
                isWritable: true,
                isNotSystem: true,
                freeSpace: 30
            });
        });

        it('should pick storage with most free space if all storages NOT USED FOR WRITING', () => {
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].freeSpace = 40;
            component.dropdownStorages.forEach(store => { store.isUsedForWriting = false; });
            expect(component.selectDefaultStorage()).toEqual({
                name: 'storage2',
                isOnline: true,
                isUsedForWriting: false,
                isWritable: true,
                isNotSystem: true,
                freeSpace: 40
            });
        });

        it('should pick storage USED FOR WRITING if only one', () => {
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages.forEach(store => { store.isUsedForWriting = store.name === 'storage5'; });
            expect(component.selectDefaultStorage()).toEqual({
                name: 'storage5',
                isOnline: true,
                isUsedForWriting: true,
                isWritable: true,
                isNotSystem: true,
                freeSpace: 5
            });
        });

        it('should pick storage with the most free space if all storages are ONLINE', () => {
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].isUsedForWriting = false;
            expect(component.selectDefaultStorage()).toEqual({
                name: 'storage3',
                isOnline: true,
                isUsedForWriting: true,
                isWritable: true,
                isNotSystem: true,
                freeSpace: 30
            });
        });

        it('should pick storage with most free space if all storages ARE NOT ONLINE', () => {
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].isUsedForWriting = false;
            component.dropdownStorages[3].freeSpace = 40;
            component.dropdownStorages.forEach(store => { store.isOnline = false; });
            expect(component.selectDefaultStorage()).toEqual({
                name: 'storage4',
                isOnline: false,
                isUsedForWriting: true,
                isWritable: true,
                isNotSystem: true,
                freeSpace: 40
            });
        });

        it('should pick ONLINE storage if only one', () => {
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].isUsedForWriting = false;
            component.dropdownStorages.forEach(store => { store.isOnline = store.name === 'storage5'; });
            expect(component.selectDefaultStorage()).toEqual({
                name: 'storage5',
                isOnline: true,
                isUsedForWriting: true,
                isWritable: true,
                isNotSystem: true,
                freeSpace: 5
            });
        });

        it('should pick storage with the most free space if all storages are WRITABLE', () => {
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].isUsedForWriting = false;
            component.dropdownStorages[2].isOnline = false;
            expect(component.selectDefaultStorage()).toEqual({
                name: 'storage5',
                isOnline: true,
                isUsedForWriting: true,
                isWritable: true,
                isNotSystem: true,
                freeSpace: 5
            });
        });

        it('should pick storage with most free space if all storages are NOT WRITABLE', () => {
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].isUsedForWriting = false;
            component.dropdownStorages[2].isOnline = false;
            component.dropdownStorages[4].freeSpace = 40;
            component.dropdownStorages.forEach(store => { store.isWritable = false; });
            expect(component.selectDefaultStorage()).toEqual({
                name: 'storage5',
                isOnline: true,
                isUsedForWriting: true,
                isWritable: false,
                isNotSystem: true,
                freeSpace: 40
            });
        });

        it('should pick WRITABLE storage if only one', () => {
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].isUsedForWriting = false;
            component.dropdownStorages[2].isOnline = false;
            component.dropdownStorages.forEach(store => { store.isOnline = store.name === 'storage5'; });
            expect(component.selectDefaultStorage()).toEqual({
                name: 'storage5',
                isOnline: true,
                isUsedForWriting: true,
                isWritable: true,
                isNotSystem: true,
                freeSpace: 5
            });
        });
    });
});
