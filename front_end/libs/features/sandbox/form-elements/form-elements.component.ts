import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxMatLikeInputComponent } from '@components/mat-like-components/mat-like-input/input.component';
import { NxMatLikePasswordComponent } from '@components/mat-like-components/mat-like-password-input/password.component';
import { NxMatLikeTypeAheadDropdown } from '@components/mat-like-components/mat-like-type-ahead-select/searchable.component';
import type { SearchableDropdownItem } from '@components/mat-like-components/mat-like-type-ahead-select/searchable.component.types';
import { NxRadioComponent } from '@components/radio/radio.component';
import { NxSelectV2ItemComponent } from '@components/select-v2/items/select-item/select-item.component';
import { NxSelectV2Component } from '@components/select-v2/select-v2.component';
// import { NxSliderComponent } from '@components/slider/slider.component';
import * as staticLang from '@language_static';
import { NxMenuService } from '@menu/menu.service';
import { PipesModule } from '@pipes/pipes.module';
import { simpleURLRegex } from '@static-variables';

import {
    ASPECT_RATIOS,
    ROTATION_OPTIONS,
} from '../../systems/settings/cameras/cameras.component.types';

@Component({
    selector: 'form-elements',
    templateUrl: 'form-elements.component.html',
    styleUrls: ['form-elements.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        NxCheckboxComponent,
        NxMatLikeInputComponent,
        NxMatLikePasswordComponent,
        NxMatLikeTypeAheadDropdown,
        // NxSliderComponent,
        NxSelectV2Component,
        NxSelectV2ItemComponent,
        NxRadioComponent,
        PipesModule,
    ],
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

    user = {
        firstName: '',
    };
    newPasswordForUser: string;

    item: SearchableDropdownItem;
    items: SearchableDropdownItem[];
    urlRegex: string;
    _remoteSystem: SearchableDropdownItem;
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

        this.urlRegex = simpleURLRegex;
        this.items = [
            {
                name: 'SOFIA - (10.0.0.1)',
                value: 'https://10.0.0.1:7001',
                help: 'Ask Tsanko',
            },
        ];
    }

    get remoteSystem(): SearchableDropdownItem {
        return this._remoteSystem;
    }

    set remoteSystem(item: SearchableDropdownItem) {
        this._remoteSystem = item;
    }

    set sliderValue(val: number) {
        this._sliderValue = val;
    }

    get sliderValue(): number {
        return this._sliderValue;
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
