import { Component, Inject, ViewChild, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';

import type {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';
import { NxToastService } from '@dialogs/toast.service';
import { NxApplyService } from '@services/apply.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxMenuService } from '@src/menu/menu.service';

@Component({
    selector: 'form-apply-example',
    templateUrl: 'form-apply-example.component.html',
    styleUrls: ['form-apply-example.component.scss']
})
export class FormApplyExampleComponent {
    CONFIG: IConfig;
    // Refs to use for rendering apply component instances
    @ViewChild('pageApply', { read: ViewContainerRef, static: true }) pageApply;

    // page process
    saveAll: Process;

    @ViewChild('form1') form1;
    formWatcher: any;
    account = {
        form1Field1Input: '',
        form1Field2Input: ''
    };

    saveForm1 : Process;

    @ViewChild('form2') form2;
    formWatcher2: any;
    form2Field1Input: string;
    saveForm2 : Process;

    options: {};

    show1: boolean;
    show2: boolean;
    blah: string;

    items: any[];
    itemsSelected: any;

    itemsDDSingle: DropdownItem<string>[];
    langCode: string = 'en_US';
    selectedDDItem: DropdownItem<string>;

    tags: any[];
    form2Group: FormGroup;

    constructor(
        configService: NxConfigService,
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private toastService: NxToastService,
        private menuService: NxMenuService,
        @Inject(ViewContainerRef) public applyContainerRef: ViewContainerRef
    ) {
        this.CONFIG = configService.config;

        this.options = {
            classname: this.CONFIG.toast.success,
            autohide: true,
            delay: this.CONFIG.alertTimeout
        };

        this.show1 = false;
        this.show2 = false;
        this.blah = 'blah1';

        this.items = [
            { label: 'Administrator', id: 'qwerty1' },
            { label: 'Advanced Viewer', id: 'qwerty2' },
            { label: 'Viewer', id: 'qwerty3' },
            { label: 'Live Viewer', id: 'qwerty4' }
        ];

        this.itemsSelected = ['qwerty2', 'qwerty3'];

        this.itemsDDSingle = [
            { value: '0', name: 'All' },
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
            { value: '15824256', name: '16mp' }
        ];

        this.selectedDDItem = { value: '0', name: 'All' };

        this.tags = [
            { name: 'brand', selected: false, type: 'brand' },
            { name: 'really long name break', selected: false, type: 'brand' },
            { name: 'success', selected: true, type: 'success' },
            { name: 'danger', selected: true, type: 'danger' },
            { name: 'warning', selected: false, type: 'warning' },
            { name: 'info', selected: false, type: 'info' },
            { name: 'default', selected: true }
        ];
    }

    ngOnInit(): void {
        this.menuService.section = 'components';
        this.menuService.detail = 'applyServiceForm';

        this.account.form1Field1Input = 'Tsanko';
        this.account.form1Field2Input = 'Tsolov';
        this.applyService.initPageFormsWatcher(this.pageApply);

        this.saveForm1 = this.processService.createProcess(() => {
            return Promise.resolve();
        }, {}, result => {
            this.toastService.show('form1 saved', this.options);
        }, _ => {
        });

        // ngModel should be ALWAYS initialized -> when comparing form values JSON stingify will omit undefined fields!!!
        this.form2Field1Input = '';
        this.saveForm2 = this.processService.createProcess(() => {
            return Promise.resolve();
        }, {}, result => {
            this.toastService.show('form2 saved', this.options);
        }, _ => {
        });
    }

    ngAfterViewInit(): void {
        this.formWatcher = this.applyService.createFormWatcher(
            'form1',
            this.form1,
            this.saveForm1);

        this.formWatcher2 = this.applyService.createFormWatcher(
            'form2',
            this.form2,
            this.saveForm2);

        // setTimeout(() => {
        //     this.applyService.removeFormWatcher('form2');
        //     this.toastService.show('form2 removed', this.options);
        // }, 5000);
    }

    ddModelChanged(result: []) {
        // ensure 'change' will be triggered
        this.itemsSelected = [...result];
    }

    ddSingleModelChanged(result: DropdownItem<string>) {
        // ensure 'change' will be triggered
        this.selectedDDItem = { ...result };
    }

    changeLanguage(result: string) {
        // ensure 'change' will be triggered
        this.langCode = result;
    }
}
