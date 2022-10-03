import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { ComponentsModule } from '@components/components.module';
import { DirectivesModule } from '@directives/directives.module';
import { NxMenusService } from '@services/menus.service';
import { nxConfig } from '@services/nx-config/config';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxUriCacheService } from '@services/uri-cache.service';
import { WINDOW } from '@services/window-provider';
import { RouterLinkDirectiveStub } from '@src/_testing';
import { PipesModule } from '@src/pipes/pipes.module';

import {
    forUnitTest,
    NxConsoleTableComponent
} from './console-table.component';
import { ListSerializer } from './console-table.component.types';

const {
    NxConfigService,
    NxDialogsService,
    NxCloudApiService,
    TableDataSource,
    ConsoleSection
} = forUnitTest;

const section = 'custom-clients';
const url = `/developers/${section}`;
const currentNode = { url };
const consoleStructure = { nodes: [currentNode] };
const [
    contextName,
    contextLabel,
    contextIcon,
    fieldName,
    fieldLabel,
    fieldDescription,
    fieldPlaceholder
] = [...new Array(7)].map(uuid);
const field = {
    name: fieldName,
    label: fieldLabel,
    description: fieldDescription,
    type: 'text',
    metaOnly: false,
    optional: false,
    placeholder: fieldPlaceholder
};

describe('NxConsoleTableComponent', () => {
    let component: NxConsoleTableComponent;
    let fixture: ComponentFixture<NxConsoleTableComponent>;
    let el: DebugElement;
    const configMock = { getConfig: () => nxConfig };
    const localStorageMock = {
        retrieve: () => { },
        observe: () => ({
            subscribe: () => { }
        })
    };
    const translateMock = {
        translations: {
            'Reset Search': () => 'Reset Search',
            Search: () => 'Search'
        }
    };
    const menuMock = {
        getMenu: () => new BehaviorSubject(consoleStructure)
    };
    const tableItems = new BehaviorSubject([]);
    const cloudMock = {
        getSubAPI: () => ({
            getManifest: () => ({
                manifest: {
                    contexts: [
                        {
                            name: contextName,
                            label: contextLabel,
                            icon: contextIcon,
                            fields: [field],
                            global: false
                        }
                    ]
                }
            }),
            list: tableItems
        })
    };
    const perPage = Math.round(Math.random() * 5 + 3);
    const minItemsAdvanced = Math.round(Math.random() * 5 + perPage);

    const addItemToComponent = (items = 1) => {
        const manifest = nxConfig.manifest[section];
        const mockItem = () => manifest.contexts.reduce((
            values, { name, type: inputType }
        ) => ({
            ...values, [name]: inputType !== 'date' ? uuid() : 0
        }), {});
        const mockItems = [...new Array(items)].map(mockItem);
        const { data } = new ListSerializer(section, manifest, mockItems);
        component.displayedColumns = (component.selectedManifest?.contexts || []).map(({ name }) => name);
        component.selectedData.updateBaseData(data);
        fixture.detectChanges();
        return mockItems as any;
    };

    beforeEach(waitForAsync(() => {
        const spyHeader = jasmine.createSpyObj('NxHeaderService', ['currentLocation']);
        TestBed
            .configureTestingModule({
                declarations: [NxConsoleTableComponent, RouterLinkDirectiveStub],
                providers: [
                    { provide: NxConfigService, useValue: configMock },
                    { provide: NxDialogsService, useValue: {} },
                    { provide: NxCloudApiService, useValue: cloudMock },
                    { provide: NxLanguageProviderService, useValue: translateMock },
                    { provide: LocalStorageService, useValue: localStorageMock },
                    { provide: WINDOW, useValue: window },
                    { provide: NxUriCacheService, useValue: {} },
                    { provide: NxMenusService, useValue: menuMock },
                    { provide: NxHeaderService, useValue: spyHeader }
                ],
                imports: [
                    CommonModule,
                    FormsModule,
                    AngularSvgIconModule.forRoot(),
                    HttpClientTestingModule,
                    TranslateModule.forRoot(),
                    ComponentsModule,
                    DirectivesModule,
                    PipesModule,
                    RouterTestingModule
                ]
            })
            .compileComponents();

        fixture = TestBed.createComponent(NxConsoleTableComponent);
        component = fixture.componentInstance;
        component.CONFIG = nxConfig;
        component.sectionParam = ConsoleSection.CUSTOM_CLIENTS;
        el = fixture.debugElement;
        component.dataLoaded = true;
        component.selectedData = new TableDataSource([], perPage, minItemsAdvanced);
        component.selectedManifest = nxConfig.manifest[component.sectionParam];
        fixture.detectChanges();
    }));

    it('should create NxConsoleTableComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should show header', () => {
        const placeholder = el.nativeElement.querySelector('.header-with-search');
        expect(placeholder.innerText).toEqual(nxConfig.manifest[section].title);
    });

    it('should show placeholder', () => {
        const placeholder = el.nativeElement.querySelector('.table-content-placeholder');
        expect(placeholder).toBeTruthy();
    });

    it('should not show placeholder when items', async () => {
        addItemToComponent();

        await fixture.whenStable();
        const placeholder = el.nativeElement.querySelector('.table-content-placeholder');
        expect(placeholder).toBeFalsy();
    });

    it('should show the correct data for item', async () => {
        const [mockItem] = addItemToComponent();

        await fixture.whenStable();
        const items = el.nativeElement.querySelectorAll('.cdk-row.data-row');
        const nameColumn = items[0].querySelector('.cdk-column-name');
        expect(nameColumn.innerText).toBe(mockItem.name);
    });

    it('should show advanced mode when many items', async () => {
        const numItems = Math.round(Math.random() * 30) + minItemsAdvanced;
        addItemToComponent(numItems);

        await fixture.whenStable();
        const paginator = el.nativeElement.querySelectorAll('nx-paginator');
        expect(paginator).toBeTruthy();
    });

    it('paginator should show correct number of pages', async () => {
        const numItems = Math.round(Math.random() * 30) + minItemsAdvanced;
        const expectedPages = Math.ceil(numItems / perPage);
        addItemToComponent(numItems);

        await fixture.whenStable();
        const paginator = el.nativeElement.querySelector('nx-paginator');
        const numOfPages = parseInt([...paginator.children].reverse()[0].innerText);
        expect(numOfPages).toEqual(
            expectedPages);
    });
});
