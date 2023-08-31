import { last } from 'lodash-es';
import { v4 as uuid } from 'uuid';

import { manifest } from '@static-variables';

import { setupComponent } from '../src/setup';

import { NxConsoleTableComponent } from './console-table.component';
import { ConsoleSection, ListSerializer } from './console-table.component.types';
import { TableDataSource } from './table-data-source';

const section = 'custom-clients';

const setupConsoleTable = async () => {
    const { component, fixture, debugElement } = await setupComponent(NxConsoleTableComponent);
    const perPage = Math.round(Math.random() * 5 + 3);
    const minItemsAdvanced = Math.round(Math.random() * 5 + perPage);

    const addItemToComponent = async (items = 1) => {
        const sectionManifest = manifest[section];
        const mockItem = () =>
            sectionManifest.contexts.reduce(
                (values, { name, type: inputType }) => ({
                    ...values,
                    [name]: inputType !== 'date' ? uuid() : 0,
                }),
                {},
            );
        const mockItems = [...new Array(items)].map(mockItem);
        const { data } = new ListSerializer(section, sectionManifest, mockItems);
        component.displayedColumns = (component.selectedManifest?.contexts || []).map(
            ({ name }) => name,
        );

        component.selectedData.updateBaseData(data);
        fixture.detectChanges();
        await fixture.whenStable();
        return mockItems as any;
    };

    component.sectionParam = ConsoleSection.CUSTOM_CLIENTS;
    component.dataLoaded = true;
    component.selectedData = new TableDataSource([], perPage, minItemsAdvanced);
    component.selectedManifest = manifest[component.sectionParam];

    fixture.detectChanges();
    await fixture.whenStable();

    return {
        perPage,
        minItemsAdvanced,
        addItemToComponent,
        component,
        fixture,
        debugElement,
    };
};

describe('NxConsoleTableComponent', () => {
    it('should create NxConsoleTableComponent', async () => {
        const { component } = await setupConsoleTable();
        expect(component).toBeTruthy();
    });

    it('should show header', async () => {
        const { debugElement } = await setupConsoleTable();
        const placeholder = debugElement.nativeElement.querySelector('.header-with-search');
        expect(placeholder.textContent).toEqual(manifest[section].title);
    });

    it('should show placeholder', async () => {
        const { debugElement } = await setupConsoleTable();
        const placeholder = debugElement.nativeElement.querySelector('.table-content-placeholder');
        expect(placeholder).toBeTruthy();
    });

    it('should not show placeholder when items', async () => {
        const { addItemToComponent, fixture, debugElement } = await setupConsoleTable();
        await addItemToComponent();

        await fixture.whenStable();
        const placeholder = debugElement.nativeElement.querySelector('.table-content-placeholder');
        expect(placeholder).toBeFalsy();
    });

    it('should show the correct data for item', async () => {
        const { addItemToComponent, fixture, debugElement } = await setupConsoleTable();
        const [mockItem] = await addItemToComponent();

        await fixture.whenStable();
        const row = debugElement.nativeElement.querySelector('.cdk-row.data-row');
        const nameColumn = row.querySelector('.cdk-column-name');
        expect(nameColumn.textContent).toBe(mockItem.name);
    });

    it('should show advanced mode when many items', async () => {
        const { addItemToComponent, fixture, debugElement, minItemsAdvanced } =
            await setupConsoleTable();
        const numItems = Math.round(Math.random() * 30) + minItemsAdvanced;
        await addItemToComponent(numItems);

        await fixture.whenStable();
        const paginator = debugElement.nativeElement.querySelectorAll('nx-paginator');
        expect(paginator).toBeTruthy();
    });

    it('paginator should show correct number of pages', async () => {
        const { addItemToComponent, fixture, debugElement, perPage, minItemsAdvanced } =
            await setupConsoleTable();
        const numItems = Math.round(Math.random() * 30) + minItemsAdvanced;
        const expectedPages = Math.ceil(numItems / perPage);
        await addItemToComponent(numItems);

        await fixture.whenStable();
        const paginator = debugElement.nativeElement.querySelector('nx-paginator');
        const numOfPages = parseInt(last([...paginator.children]).textContent);
        expect(numOfPages).toEqual(expectedPages);
    });
});
