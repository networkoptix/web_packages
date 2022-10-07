import { Component, Inject, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';

import { NxMenuService } from '@app/menu/menu.service';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { WINDOW } from '@services/window-provider';

import type {
    AspectRatioDropdownItem,
    RotationDropdownItem,
} from '../../systems/settings/cameras/cameras.component.types';

@Component({
    selector: 'form-elements',
    templateUrl: 'form-elements.component.html',
    styleUrls: ['form-elements.component.scss']
})
export class FormElementsComponent {
    submitted = false;
    show: boolean;
    toggleDisabled: boolean;
    show5: boolean;
    blah;
    group;
    agree;
    edit;
    wholeText;
    data;
    selectedAspect: AspectRatioDropdownItem;
    aspectRatios: AspectRatioDropdownItem[];
    selectedRotation: RotationDropdownItem;
    rotations: RotationDropdownItem[];
    itemsSearchableDDSingle: DropdownItem<string>[];
    selectedSearchableDDItem: DropdownItem<string>;

    @ViewChild('testForm', { static: true }) public testForm: NgForm;

    constructor(
        private menuService: NxMenuService,
        @Inject(WINDOW) private window: Window,
    ) {}

    ngOnInit(): void {
        this.menuService.section = 'components';
        this.menuService.detail = 'formElements';

        this.toggleDisabled = true;
        this.show = false;
        this.show5 = false;
        this.blah = 'blah1';
        this.group = 'Tsanko';
        this.agree = false;
        this.edit = false;

        this.wholeText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

        this.aspectRatios = [
            { name: '4:3', value: 1.33333 },
            { name: '16:9', value: 1.77778 },
            { name: '1:1', value: 1 }
        ];
        this.selectedAspect = this.aspectRatios[0];

        this.rotations = [
            { name: '0˚', value: 0 },
            { name: '90˚', value: 90 },
            { name: '180˚', value: 180 },
            { name: '270˚', value: 270 }
        ];
        this.selectedRotation = this.rotations[0];

        this.itemsSearchableDDSingle = [
            { value: 'test@test.com', name: 'test@test.com', help: 'Johnny Test' },
            { value: 'test1@test.com', name: 'test1@test.com', help: 'Test Test Test Test Test Test Test' },
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
    }

    ddSearchableModelChanged(result: DropdownItem<string>): void {
        // ensure 'change' will be triggered
        this.selectedSearchableDDItem = { ...result };
    }

    private touchForm(form): void {
        for (const ctrl in form.form.controls) {
            if (Object.prototype.hasOwnProperty.call(form.form.controls, ctrl)) {
                form.form.get(ctrl).markAsTouched();
            }
        }
    }

    onSubmit() {
        if (this.testForm && !this.testForm.valid) {
            // Set the form touched
            this.touchForm(this.testForm);

            return false;
        }

        this.submitted = true;
        this.window.alert('SUBMIT!');
    }
}
