import { BehaviorSubject } from 'rxjs';

import { setupComponent } from '@pages/src/setup';

import { NxSystemStandardServerComponent } from './server-standard.component';
import type { DropdownStorage } from './server-standard.component.types';

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

const setupSystemServerComponent = async (): ReturnType<typeof setupComponent<NxSystemStandardServerComponent>> => {
    NxSystemStandardServerComponent.prototype.system = {} as typeof NxSystemStandardServerComponent.prototype.system;
    const setup = await setupComponent(NxSystemStandardServerComponent);
    (setup.component.route.queryParams as BehaviorSubject<unknown>).next({ state: undefined });
    setup.component.dropdownStorages = JSON.parse(
        JSON.stringify(dropdownsMock)) as typeof setup.component.dropdownStorages;
    setup.fixture.detectChanges();
    return setup;
};

describe('NxSystemStandardServerComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupSystemServerComponent();
        expect(component).toBeTruthy();
    });

    describe('Selecting Default Storage', () => {
        it('should pick only storage if only one storage in dropdown storages', async () => {
            const { component } = await setupSystemServerComponent();
            component.dropdownStorages = component.dropdownStorages.slice(1, 2);
            expect(component.selectDefaultStorage()).toEqual(dropdownsMock[1]);
        });

        it('should pick storage with the most free space if all NON-SYSTEM storages', async () => {
            const { component } = await setupSystemServerComponent();
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[2]);
        });

        it('should pick storage with most free space if all system storages', async () => {
            const { component } = await setupSystemServerComponent();
            component.dropdownStorages.forEach(store => {
                store.isNotSystem = false;
            });
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[2]);
        });

        it('should pick NON-SYSTEM storage if only one', async () => {
            const { component } = await setupSystemServerComponent();
            component.dropdownStorages.forEach(store => {
                store.isNotSystem = store.name === 'storage5';
            });
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[4]);
        });

        it('should pick storage with the most free space if all storages USED FOR WRITING', async () => {
            const { component } = await setupSystemServerComponent();
            component.dropdownStorages[0].isNotSystem = false;
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[2]);
        });

        it('should pick storage with most free space if all storages NOT USED FOR WRITING', async () => {
            const { component } = await setupSystemServerComponent();
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].freeSpace = 40;
            component.dropdownStorages.forEach(store => {
                store.isUsedForWriting = false;
            });
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[1]);
        });

        it('should pick storage USED FOR WRITING if only one', async () => {
            const { component } = await setupSystemServerComponent();
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages.forEach(store => {
                store.isUsedForWriting = store.name === 'storage5';
            });
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[4]);
        });

        it('should pick storage with the most free space if all storages are ONLINE', async () => {
            const { component } = await setupSystemServerComponent();
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].isUsedForWriting = false;
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[2]);
        });

        it('should pick storage with most free space if all storages ARE NOT ONLINE', async () => {
            const { component } = await setupSystemServerComponent();
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].isUsedForWriting = false;
            component.dropdownStorages[3].freeSpace = 40;
            component.dropdownStorages.forEach(store => {
                store.isOnline = false;
            });
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[3]);
        });

        it('should pick ONLINE storage if only one', async () => {
            const { component } = await setupSystemServerComponent();
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].isUsedForWriting = false;
            component.dropdownStorages.forEach(store => {
                store.isOnline = store.name === 'storage5';
            });
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[4]);
        });

        it('should pick storage with the most free space if all storages are WRITABLE', async () => {
            const { component } = await setupSystemServerComponent();
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].isUsedForWriting = false;
            component.dropdownStorages[2].isOnline = false;
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[4]);
        });

        it('should pick storage with most free space if all storages are NOT WRITABLE', async () => {
            const { component } = await setupSystemServerComponent();
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].isUsedForWriting = false;
            component.dropdownStorages[2].isOnline = false;
            component.dropdownStorages[4].freeSpace = 40;
            component.dropdownStorages.forEach(store => {
                store.isWritable = false;
            });
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[4]);
        });

        it('should pick WRITABLE storage if only one', async () => {
            const { component } = await setupSystemServerComponent();
            component.dropdownStorages[0].isNotSystem = false;
            component.dropdownStorages[1].isUsedForWriting = false;
            component.dropdownStorages[2].isOnline = false;
            component.dropdownStorages.forEach(store => {
                store.isOnline = store.name === 'storage5';
            });
            expect(component.selectDefaultStorage()).toEqual(component.dropdownStorages[4]);
        });
    });
});
