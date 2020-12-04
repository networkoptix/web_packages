import { async }          from '@angular/core/testing';
import { HttpClient }     from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

import { NxSystemStandardServerComponent } from './server-standard.component';
import { NxConfigService }                 from '../../../../../services/nx-config';
import { NxLanguageProviderService }       from '../../../../../services/nx-language-provider';
import { NxProcessService }                from '../../../../../services/process.service';
import { NxApplyService }                  from '../../../../../services/apply.service';
import { NxDialogsService }                from '../../../../../dialogs/dialogs.service';
import { NxMenuService }                   from '../../../../../menu';
import { NxUriService }                    from '../../../../../services/uri.service';
import { NxToastService }                  from '../../../../../dialogs/toast.service';

describe('NxSystemStandardServerComponent', () => {
    let configMock: NxConfigService;
    let langMock: NxLanguageProviderService;
    let applyMock: NxApplyService;
    let processMock: NxProcessService;
    let routeMock: ActivatedRoute;
    let dialogMock: NxDialogsService;
    let menuMock: NxMenuService;
    let uriMock: NxUriService;
    let toastMock: NxToastService;
    let component: NxSystemStandardServerComponent;
    beforeAll(async (() => {
        configMock = new NxConfigService(new HttpClient(null));
        langMock = jest.createMockFromModule('../../../../../services/nx-language-provider');
        applyMock = jest.createMockFromModule('../../../../../services/apply.service');
        processMock = jest.createMockFromModule('../../../../../services/process.service');
        routeMock = jest.createMockFromModule('@angular/router');
        dialogMock = jest.createMockFromModule('../../../../../dialogs/dialogs.service');
        menuMock = jest.createMockFromModule('../../../../../menu');
        uriMock = jest.createMockFromModule('../../../../../services/uri.service');
        toastMock = jest.createMockFromModule('../../../../../dialogs/toast.service');
        component = new NxSystemStandardServerComponent(
            configMock, langMock, applyMock, processMock, 
            routeMock, dialogMock, menuMock, uriMock, toastMock
        );
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
                },
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
        })

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
            component.dropdownStorages.forEach(store => store.isNotSystem = false);
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
            component.dropdownStorages.forEach(store => store.isNotSystem = store.name === 'storage5');
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
            component.dropdownStorages.forEach(store => store.isUsedForWriting = false);
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
            component.dropdownStorages.forEach(store => store.isUsedForWriting = store.name === 'storage5');
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
            component.dropdownStorages.forEach(store => store.isOnline = false);
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
            component.dropdownStorages.forEach(store => store.isOnline = store.name === 'storage5');
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
            component.dropdownStorages.forEach(store => store.isWritable = false);
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
            component.dropdownStorages.forEach(store => store.isOnline = store.name === 'storage5');
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
