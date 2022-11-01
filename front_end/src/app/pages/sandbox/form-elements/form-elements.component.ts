import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';

import { NxMenuService } from '@app/menu/menu.service';

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

    @ViewChild('testForm', { static: true }) public testForm: NgForm;

    constructor(
        private menuService: NxMenuService,
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
        window.alert('SUBMIT!');
    }
}
