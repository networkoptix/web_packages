import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { SearchableDropdownItem as Item } from '@components/dropdowns/searchable/searchable.component.types';
import * as staticLang from '@language_static';
import { NxMenuService } from '@menu/menu.service';
import { simpleURLRegex } from '@static-variables';

import {
    ASPECT_RATIOS,
    ROTATION_OPTIONS,
} from '../../systems/settings/cameras/cameras.component.types';

@Component({
    selector: 'form-elements',
    templateUrl: 'form-elements.component.html',
    styleUrls: ['form-elements.component.scss'],
})
export class FormElementsComponent {
    LANG = staticLang;
    submitted = false;
    show: boolean;
    toggleDisabled: boolean;
    show5: boolean;
    blah: string;
    group: string;
    agree: boolean;
    edit: boolean;
    wholeText: string;
    selectedAspect: number = ASPECT_RATIOS['4:3'];
    aspectRatioOptions = ASPECT_RATIOS;
    selectedRotation: number = 0;
    rotations = ROTATION_OPTIONS;
    itemsSearchableDDSingle: DropdownItem<string>[];
    selectedSearchableDDItem: DropdownItem<string>;

    user = {
        firstName: '',
    };
    newPasswordForUser: string;

    item: Item;
    items: Item[];
    urlRegex: string;
    _remoteSystem: Item;
    _sliderValue: number = 0;

    @ViewChild('testForm', { static: true }) public testForm: NgForm;

    constructor(private menuService: NxMenuService) {}

    ngOnInit(): void {
        this.menuService.selectedSection$$.set('components');
        this.menuService.selectedDetailsSection$$.set('formElements');

        this.toggleDisabled = true;
        this.show = false;
        this.show5 = false;
        this.blah = 'blah1';
        this.group = 'Tsanko';
        this.agree = false;
        this.edit = false;

        this.wholeText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

        this.itemsSearchableDDSingle = [
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

        this.urlRegex = simpleURLRegex;
        this.items = [
            {
                name: 'SOFIA - (10.0.0.1)',
                value: 'https://10.0.0.1:7001',
                help: 'Ask Tsanko',
            },
        ];
    }

    get remoteSystem(): Item {
        return this._remoteSystem;
    }

    set remoteSystem(item: Item) {
        this._remoteSystem = item;
    }

    set sliderValue(val: number) {
        this._sliderValue = val;
    }

    get sliderValue(): number {
        return this._sliderValue;
    }

    ddSearchableModelChanged(result: DropdownItem<string>): void {
        // ensure 'change' will be triggered
        this.selectedSearchableDDItem = { ...result };
    }

    private touchForm(form: NgForm): void {
        for (const ctrl in form.form.controls) {
            if (Object.prototype.hasOwnProperty.call(form.form.controls, ctrl)) {
                form.form.get(ctrl).markAsTouched();
            }
        }
    }

    onSubmit(): false | undefined {
        if (this.testForm && !this.testForm.valid) {
            // Set the form touched
            this.touchForm(this.testForm);

            return false;
        }

        this.submitted = true;
        window.alert('SUBMIT!');
    }
}
