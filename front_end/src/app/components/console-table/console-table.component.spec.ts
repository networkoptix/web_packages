import { Overlay } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { last } from 'lodash-es';
import { MockProvider, MockModule, MockDirective } from 'ng-mocks';
import { LocalStorageService } from 'ngx-webstorage';
import { timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

import { ComponentsModule } from '@components/components.module';
import { PaginatorModule } from '@components/paginator/paginator.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SearchModule } from '@components/search/search.module';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { DirectivesModule } from '@directives/directives.module';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { NxMenusService } from '@services/menus.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxUriCacheService } from '@services/uri-cache.service';
import { WINDOW } from '@services/window-provider';
import { PipesModule } from '@app/pipes/pipes.module';

import { NxConsoleTableComponent } from './console-table.component';
import {
    ListSerializer,
    ConsoleSection
} from './console-table.component.types';
import { TableDataSource } from './table-data-source';

const section = 'custom-clients';

describe('NxConsoleTableComponent', () => {
    let component: NxConsoleTableComponent;
    let fixture: ComponentFixture<NxConsoleTableComponent>;
    let el: DebugElement;

    const perPage = Math.round(Math.random() * 5 + 3);
    const minItemsAdvanced = Math.round(Math.random() * 5 + perPage);

    const addItemToComponent = async (items = 1) => {
        const manifest = nxConfig.manifest[section];
        const mockItem = () => manifest.contexts.reduce((
            values, { name, type: inputType }
        ) => ({
            ...values, [name]: inputType !== 'date' ? uuid() : 0
        }), {});
        const mockItems = [...new Array(items)].map(mockItem);
        const { data } = new ListSerializer(section, manifest, mockItems);
        component.displayedColumns = (component.selectedManifest?.contexts || []).map(({ name }) => name);

        // There seems to be some weird edge case that causes 'paginator should show correct number of pages' to fail intermittently
        // Seems to be really rare, it only seems to happen a couple times a week.
        // If the failure for this case still happens in the future then these changes should be reverted.
        const updated = component.selectedData.connect().pipe(takeUntil(timer(10))).toPromise();

        component.selectedData.updateBaseData(data);
        await updated;
        fixture.detectChanges();
        await fixture.whenStable();
        return mockItems as any;
    };

    beforeEach(waitForAsync(() => {
        TestBed
            .configureTestingModule({
                declarations: [
                    NxConsoleTableComponent,
                    MockDirective(NxTooltipDirective),
                ],
                providers: [
                    MockProvider(NxConfigService),
                    MockProvider(NxDialogsService),
                    MockProvider(NxCloudApiService),
                    MockProvider(NxLanguageProviderService),
                    MockProvider(LocalStorageService),
                    MockProvider(WINDOW),
                    MockProvider(NxUriCacheService),
                    MockProvider(NxMenusService),
                    MockProvider(NxHeaderService),
                    MockProvider(Overlay)
                ],
                imports: [
                    MockModule(CommonModule),
                    MockModule(FormsModule),
                    AngularSvgIconModule.forRoot(),
                    HttpClientTestingModule,
                    TranslateModule.forRoot(),
                    ComponentsModule,
                    DirectivesModule,
                    MockModule(PipesModule),
                    RouterTestingModule,
                    PaginatorModule,
                    PreLoaderModule,
                    SearchModule
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
        await addItemToComponent();

        await fixture.whenStable();
        const placeholder = el.nativeElement.querySelector('.table-content-placeholder');
        expect(placeholder).toBeFalsy();
    });

    it('should show the correct data for item', async () => {
        const [mockItem] = await addItemToComponent();

        await fixture.whenStable();
        const items = el.nativeElement.querySelectorAll('.cdk-row.data-row');
        const nameColumn = items[0].querySelector('.cdk-column-name');
        expect(nameColumn.innerText).toBe(mockItem.name);
    });

    it('should show advanced mode when many items', async () => {
        const numItems = Math.round(Math.random() * 30) + minItemsAdvanced;
        await addItemToComponent(numItems);

        await fixture.whenStable();
        const paginator = el.nativeElement.querySelectorAll('nx-paginator');
        expect(paginator).toBeTruthy();
    });

    it('paginator should show correct number of pages', async () => {
        const numItems = Math.round(Math.random() * 30) + minItemsAdvanced;
        const expectedPages = Math.ceil(numItems / perPage);
        await addItemToComponent(numItems);

        await fixture.whenStable();
        const paginator = el.nativeElement.querySelector('nx-paginator');
        const numOfPages = parseInt(last([...paginator.children]).innerText);
        expect(numOfPages).toEqual(
            expectedPages);
    });
});
