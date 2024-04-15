import { CdkFixedSizeVirtualScroll, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { map, timer } from 'rxjs';

import { SearchInputComponent } from '@authorization/src/app/components/basic-search-input/basic-search-input.component';
import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxMultiSelectDropdown } from '@components/dropdowns/multi-select/multi-select.component';
import {
    DATA_TYPE,
    MultiSelectItem,
} from '@components/dropdowns/multi-select/multi-select.component.types';
import { NxSearchableDropdown } from '@components/dropdowns/searchable/searchable.component';
import { NxMatLikeGenericDropdownModule } from '@components/mat-like-components/mat-like-generic-select/dropdown.module';
import { NxMultiSelectV2ItemComponent } from '@components/select-v2/items/multi-select-item/multi-select-item.component';
import { NxSelectV2ItemComponent } from '@components/select-v2/items/select-item/select-item.component';
import { NxMultiSelectV2Component } from '@components/select-v2/multi-select-v2.component';
import { NxSelectV2Component } from '@components/select-v2/select-v2.component';
import { NxMenuService } from '@menu/menu.service';

import { DropdownConfiguration, ComplicatedObject } from './multy-select.component.types';

@Component({
    selector: 'multi-select',
    templateUrl: 'multi-select.component.html',
    styleUrls: ['multi-select.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        NxSelectV2Component,
        NxSelectV2ItemComponent,
        NxMultiSelectV2Component,
        NxMultiSelectV2ItemComponent,
        NxMultiSelectDropdown,
        NxMatLikeGenericDropdownModule,
        NxGenericDropdownModule,
        NxSearchableDropdown,
        NxCheckboxComponent,
        CdkFixedSizeVirtualScroll,
        CdkVirtualScrollViewport,
        ReactiveFormsModule,
        SearchInputComponent,
    ],
})
export class MultiSelectComponent {
    items: MultiSelectItem[] = [];
    itemsSelected: string[];
    tooManyItems: MultiSelectItem[] = [];
    itemsSelectedTooMany: string[];
    itemsOther: MultiSelectItem[] = [];
    itemsNameId: Record<string, string>[];
    itemsSelectedOther: string[];
    mode: DropdownItem<string>[];
    modeSelected: DropdownItem<string>;
    ddWidth: number;
    itemsDDSingle: DropdownItem<string>[];
    selectedDDItem: DropdownItem<string>;
    itemsDDSingleOther: DropdownItem<string>[];
    selectedDDItemOther: DropdownItem<string>;
    itemsSearchableDDSingle: DropdownItem<string>[];
    selectedSearchableDDItem: DropdownItem<string>;
    dropdownConfiguration: DropdownConfiguration;
    booleanConfigurationArray: string[];
    stringConfigurationArray: string[];

    selectedState: string = 'California';
    selectedStates: string[] = ['Arizona', 'California', 'Delaware'];
    states = [
        'Alabama',
        'Alaska',
        'American Samoa',
        'Arizona',
        'Arkansas',
        'California',
        'Colorado',
        'Connecticut',
        'Delaware',
        'District Of Columbia',
        'Federated States Of Micronesia',
        'Florida',
        'Georgia',
        'Guam',
        'Hawaii',
        'Idaho',
        'Illinois',
        'Indiana',
        'Iowa',
        'Kansas',
        'Kentucky',
        'Louisiana',
        'Maine',
        'Marshall Islands',
    ];

    complicatedObjectArray: ComplicatedObject[] = [
        {
            userId: 'abc1@networkoptix.com',
            email: 'abc1@networkoptix.com',
            fullName: 'Person 1',
            accessLevel: ['N/A'],
            roles: ['Administrator', 'Manager'],
            title: '',
            created: '2023-08-24T19:14:46.748Z',
        },
        {
            userId: 'abc2@networkoptix.com',
            email: 'abc2@networkoptix.com',
            fullName: 'Person 2',
            accessLevel: ['N/A'],
            roles: ['Administrator', 'Manager'],
            title: '',
            created: '2023-08-24T19:14:46.748Z',
        },
        {
            userId: 'abc3@networkoptix.com',
            email: 'abc3@networkoptix.com',
            fullName: 'Person 3',
            accessLevel: ['N/A'],
            roles: ['Administrator', 'Manager'],
            title: '',
            created: '2023-08-24T19:14:46.748Z',
        },
        {
            userId: 'abc4@networkoptix.com',
            email: 'abc4@networkoptix.com',
            fullName: 'Person 4',
            accessLevel: ['N/A'],
            roles: ['Administrator', 'Manager'],
            title: '',
            created: '2023-08-24T19:14:46.748Z',
        },
        {
            userId: 'abc5@networkoptix.com',
            email: 'abc5@networkoptix.com',
            fullName: 'Person 5',
            accessLevel: ['N/A'],
            roles: ['Administrator', 'Manager'],
            title: '',
            created: '2023-08-24T19:14:46.748Z',
        },
        {
            userId: 'abc6@networkoptix.com',
            email: 'abc6@networkoptix.com',
            fullName: 'Person 6',
            accessLevel: ['N/A'],
            roles: ['Administrator', 'Manager'],
            title: '',
            created: '2023-08-24T19:14:46.748Z',
        },
        {
            userId: 'abc7@networkoptix.com',
            email: 'abc7@networkoptix.com',
            fullName: 'Person 7',
            accessLevel: ['N/A'],
            roles: ['Administrator', 'Manager'],
            title: '',
            created: '2023-08-24T19:14:46.748Z',
        },
        {
            userId: 'abc8@networkoptix.com',
            email: 'abc8@networkoptix.com',
            fullName: 'Person 8',
            accessLevel: ['N/A'],
            roles: ['Administrator', 'Manager'],
            title: '',
            created: '2023-08-24T19:14:46.748Z',
        },
        {
            userId: 'abc9@networkoptix.com',
            email: 'abc9@networkoptix.com',
            fullName: 'Person 9',
            accessLevel: ['N/A'],
            roles: ['Administrator', 'Manager'],
            title: '',
            created: '2023-08-24T19:14:46.748Z',
        },
        {
            userId: 'abc10@networkoptix.com',
            email: 'abc10@networkoptix.com',
            fullName: 'Person 10',
            accessLevel: ['N/A'],
            roles: ['Administrator', 'Manager'],
            title: '',
            created: '2023-08-24T19:14:46.748Z',
        },
        {
            userId: 'abc11@networkoptix.com',
            email: 'abc11@networkoptix.com',
            fullName: 'Person 11',
            accessLevel: ['N/A'],
            roles: ['Administrator', 'Manager'],
            title: '',
            created: '2023-08-24T19:14:46.748Z',
        },
        {
            userId: 'abc12@networkoptix.com',
            email: 'abc12@networkoptix.com',
            fullName: 'Person 12',
            accessLevel: ['N/A'],
            roles: ['Administrator', 'Manager'],
            title: '',
            created: '2023-08-24T19:14:46.748Z',
        },
        {
            userId: 'abc13@networkoptix.com',
            email: 'abc13@networkoptix.com',
            fullName: 'Person 13',
            accessLevel: ['N/A'],
            roles: ['Administrator', 'Manager'],
            title: '',
            created: '2023-08-24T19:14:46.748Z',
        },
    ];
    selectedComplicatedObjectV2: ComplicatedObject | undefined = undefined;
    selectedComplicatedObject: ComplicatedObject | undefined = {} as ComplicatedObject;
    selectedComplicatedObjects: ComplicatedObject[] = [];
    isSelected(item: ComplicatedObject): boolean {
        return this.selectedComplicatedObjects?.some(i => i.userId === item.userId);
    }

    // Changing Dropdown Options
    timer1 = timer(0, 1000);
    timer2 = timer(500, 1000).pipe(map(x => x * 13));
    selectedTimer = 0;

    dropdownForm = new FormGroup({
        singleStateDropdown: new FormControl(this.states[0]),
        multiStateDropdown: new FormControl<string[]>([]),
    });
    onDropdownFormSubmit(): void {
        alert(JSON.stringify(this.dropdownForm.value));
    }
    onFormReset(): void {
        this.dropdownForm.controls.singleStateDropdown.setValue(this.states[0]);
        this.dropdownForm.controls.multiStateDropdown.setValue([this.states[0]]);
        this.dropdownForm.markAsPristine();
    }

    logOnChange(event: unknown): void {
        console.log('onChange', event);
    }

    constructor(private menuService: NxMenuService) {}

    ngOnInit(): void {
        this.menuService.selectedSection$$.set('components');
        this.menuService.selectedDetailsSection$$.set('dropdowns');

        this.dropdownConfiguration = {
            type: '',
            disabled: false,
            canSearch: false,
            ellipsisMargin: false,
            hideSelectedItem: false,
            hrMargin: false,
            merge: false,
            noMatchMsg: '',
            stillLoading: false,
        };
        this.booleanConfigurationArray = Object.keys(this.dropdownConfiguration).filter(
            (k: string) => typeof this.dropdownConfiguration[k] === 'boolean',
        );
        this.stringConfigurationArray = Object.keys(this.dropdownConfiguration).filter(
            (k: string) => typeof this.dropdownConfiguration[k] === 'string',
        );

        this.items = [
            { label: 'Administrator', id: 'qwerty1' },
            { label: 'Advanced Viewer', id: 'qwerty2' },
            { label: 'Viewer', id: 'qwerty3' },
            { label: 'Live Viewer', id: 'qwerty4' },
            { label: 'Administrator', id: 'qwerty11' },
            { label: 'Advanced Viewer', id: 'qwerty12' },
            { label: 'Viewer', id: 'qwerty13' },
            { label: 'Live Viewer', id: 'qwerty14' },
            { label: 'Administrator', id: 'qwerty21' },
            { label: 'Advanced Viewer', id: 'qwerty22' },
            { label: 'Viewer', id: 'qwerty23' },
            { label: 'Live Viewer', id: 'qwerty24' },
        ];

        this.itemsOther = [
            { label: 'Administrator', id: 'qwerty1' },
            { label: 'Advanced Viewer', id: '2' },
            { label: 'Pizza Eater', id: '3' },
            { label: 'Live Viewer', id: '4' },
            { label: 'Administrator', id: '11' },
            { label: 'Advanced Viewer', id: '12' },
            { label: 'Viewer', id: '13' },
            { label: 'Live Viewer', id: '14' },
            { label: 'Administrator', id: '21' },
            { label: 'Advanced Viewer', id: '22' },
            { label: 'Viewer', id: '23' },
            { label: 'Live Viewer', id: '24' },
        ];

        this.itemsNameId = [
            { name: 'Administrator asdasda das das das d as da sdasd as da sd', id: 'qwerty1' },
            { name: 'Advanced Viewer', id: '2' },
        ];

        this.itemsSelectedTooMany = [];
        this.itemsSelected = ['qwerty2', 'qwerty3'];
        this.itemsSelectedOther = ['3'];

        this.itemsDDSingle = [
            { value: '0', name: 'All' },
            {
                value: '1',
                name: 'superlonngselectitemtotestmarginifitisthereanditreallygoesoutofboundsofanylongdropdown',
            },
            {
                value: '2',
                name: 'horizontal',
            },
            {
                value: '3',
                name: 'seperator',
            },
            { value: '84480', name: '1CIF' },
            { value: '168960', name: '2CIF' },
            { value: '337920', name: 'D1' },
            { value: '307200', name: 'VGA' },
            { value: '786432', name: 'SVGA' },
            { value: '921600', name: '720p' },
            { value: '1310720', name: '1mp' },
            { value: '2073600', name: '1080p' },
            { value: '1920000', name: '2mp' },
            { value: '3145728', name: '3mp' },
            { value: '4915200', name: '5mp' },
            { value: '8000000', name: '8mp' },
            { value: '10039296', name: '10mp' },
            { value: '15824256', name: '16mp' },
        ];

        this.itemsDDSingleOther = [
            { value: '0', name: 'All' },
            {
                value: '1',
                name: 'superlonngselectitemtotestmarginifitisthereanditreallygoesoutofboundsofanylongdropdown',
            },
            {
                value: '2',
                name: 'horizontal',
            },
            {
                value: '3',
                name: 'seperator',
            },
            { value: '84480', name: '1CIF' },
            { value: '168960', name: '2CIF' },
            { value: '337920', name: 'D1' },
            { value: '307200', name: 'VGA' },
            { value: '786432', name: 'SVGA' },
            { value: '921600', name: '720p' },
            { value: '1310720', name: '1mp' },
            { value: '2073600', name: '1080p' },
            { value: '1920000', name: '2mp' },
            { value: '3145728', name: '3mp' },
            { value: '4915200', name: '5mp' },
            { value: '8000000', name: '8mp' },
            { value: '10039296', name: '10mp' },
            { value: '15824256', name: '16mp' },
        ];

        // this.selectedDDItem = { value: '0', name: 'All' };
        this.itemsSearchableDDSingle = [
            {
                value: 'test adawdq  dqwd qw dqw d qw d qw dqw d qw d qw d qw d qw dqw d qwd',
                name: 'test adawdq  dqwd qw dqw d qw d qw dqw d qw d qw d qw d qw dqw d qwd',
            },
            { value: 'test@test.com', name: 'test@test.com', help: 'Johnny Test' },
            {
                value: 'test1@test.com',
                name: 'test1@test.com',
                help: 'Test Test Test Test Test Test Test',
            },
            { value: 'test2@test.com', name: 'test2@test.com', help: 'Test 2' },
            { value: 'test3@test.com', name: 'test3@test.com', help: 'Test 3' },
            { value: 'test4@test.com', name: 'test4@test.com', help: 'Test 4' },
            { value: 'test5@test.com', name: 'test5@test.com', help: 'Test 5' },
            { value: 'test6@test.com', name: 'test6@test.com', help: 'Test 6' },
            { value: 'test7@test.com', name: 'test7@test.com', help: 'Test 7' },
            { value: 'test8@test.com', name: 'test8@test.com', help: 'Test 8' },
            { value: 'test9@test.com', name: 'test9@test.com', help: 'Test 9' },
            { value: 'test10@test.com', name: 'test10@test.com', help: 'Test 10' },
            { value: 'test11@test.com', name: 'test11@test.com', help: 'Test 11' },
            { value: 'test12@test.com', name: 'test12@test.com', help: 'Test 12' },
            { value: 'test13@test.com', name: 'test13@test.com', help: 'Test 13' },
            { value: 'test14@test.com', name: 'test14@test.com', help: 'Test 14' },
            { value: 'test15@test.com', name: 'test15@test.com', help: 'Test 15' },
            { value: 'test16@test.com', name: 'test16@test.com', help: 'Test 16' },
            { value: 'test17@test.com', name: 'test17@test.com', help: 'Test 17' },
            { value: 'test18@test.com', name: 'test18@test.com', help: 'Test 18' },
            { value: 'test19@test.com', name: 'test19@test.com', help: 'Test 19' },
            { value: 'test20@test.com', name: 'test20@test.com', help: 'Test 20' },
        ];

        this.mode = [
            { name: 'Main', value: 'qwerty2' },
            { name: 'Backup', value: 'qwerty3' },
            { name: 'Not in use', value: 'qwerty4' },
        ];

        this.modeSelected = this.mode[2];

        this.tooManyItems = Array.from({ length: 100000 }).map((_, i): MultiSelectItem => {
            return {
                id: '' + i,
                label: '' + i,
            };
        });

        // calculate dd size
        const btn = document.createElement('span');
        btn.style.visibility = 'hidden';
        btn.innerText = this.modeSelected.name;
        document.body.appendChild(btn);
        // add button's left and right padding and space for info icon
        this.ddWidth = Math.round(btn.getBoundingClientRect().width + 100);
    }

    modelChangedTooMany(result: string[]): void {
        // ensure 'change' will be triggered
        this.itemsSelectedTooMany = [...result];
    }

    modelChanged(result: string[]): void {
        // ensure 'change' will be triggered
        this.itemsSelected = [...result];
    }

    modelChangedOther(result: string[]): void {
        // ensure 'change' will be triggered
        this.itemsSelectedOther = [...result];
    }

    ddSingleModelChanged(result: DropdownItem<string>): void {
        // ensure 'change' will be triggered
        this.selectedDDItem = { ...result };
    }

    ddSingleModelChangedOther(result: DropdownItem<string>): void {
        // ensure 'change' will be triggered
        this.selectedDDItemOther = { ...result };
    }

    ddSearchableModelChanged(result: DropdownItem<string>): void {
        // ensure 'change' will be triggered
        this.selectedSearchableDDItem = { ...result };
    }

    protected readonly DATA_TYPE = DATA_TYPE;
}
