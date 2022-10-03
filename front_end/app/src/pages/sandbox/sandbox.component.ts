import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { ISelect } from '@pages/systems/settings/cameras/cameras.component';
import { NxProcessService, Process } from '@services/process.service';

@Component({
    selector: 'sandbox-component',
    templateUrl: 'sandbox.component.html',
    styleUrls: ['sandbox.component.scss']
})

export class NxSandboxComponent {
    click;
    blah: string;
    group: string;
    agree: boolean;
    show: boolean;
    toggleDisabled: boolean;
    show5: boolean;
    edit: boolean;
    sections;
    options;
    items;
    itemsSelected;
    mode;
    modeSelected;
    ddWidth: number;
    selectedAspect: ISelect;
    aspectRatios: ISelect[];
    selectedRotation: ISelect;
    rotations: ISelect[];
    filter;
    autohide: boolean;
    ipvdEmbedUrl: SafeResourceUrl;
    // cameraEmbedUrl: SafeResourceUrl;
    data: any = {};
    theme: string;
    change: Process;
    restore: Process;
    wholeText: string;

    submitted = false;

    @ViewChild('testForm', { static: true }) public testForm: NgForm;

    private setupDefaults() {
        this.wholeText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

        this.data = {
            newPassword: '',
            email: ''
        };

        let host = '//' + window.location.hostname;
        if (host === '//localhost' || host === '//127.0.0.1') {
            host += ':9000';
        }

        this.ipvdEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
            host + '/embed/ipvd'
        );

        // camera auth should not be used with the same domain as it screws login info - test should be done in external
        // environment like JSFiddle
        // this.cameraEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(host + '/embed/XXXXXXX/view/XXXXXXXXXX?nocameras&noheader&nocontrols&auth=XXXXXXXXXX');

        this.toggleDisabled = true;
        this.show = false;
        this.show5 = false;
        this.blah = 'blah1';
        this.group = 'Tsanko';
        this.agree = false;
        this.edit = false;

        this.theme = 'default';

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

        this.filter = {
            query: '',
            selects: [
                {
                    label: 'Minimum Resolution',
                    items: [
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
                    ],
                    selected: undefined
                }
            ],
            multiselects: [
                {
                    label: 'Types',
                    items: [
                        { id: 'Camera', label: 'Camera' },
                        { id: 'Multi-Sensor Camera', label: 'Multi-Sensor Camera' },
                        { id: 'Encoder', label: 'Encoder' },
                        { id: 'DVR', label: 'DVR' },
                        { id: 'Other', label: 'Other' }
                    ],
                    selected: undefined
                }
            ],
            tags: [
                {
                    label: 'Access Control',
                    value: false
                },
                {
                    label: 'Analytics',
                    value: false
                },
                {
                    label: 'PCIM',
                    value: false
                }
            ]
        };

        this.sections = [
            { title: 'section1', content: 'Some content' },
            { title: 'section2', content: 'Other content' }
        ];

        this.options = [
            { name: 'brand', selected: false, type: 'brand' },
            { name: 'really long name break', selected: false, type: 'brand' },
            { name: 'success', selected: true, type: 'success' },
            { name: 'danger', selected: true, type: 'danger' },
            { name: 'warning', selected: false, type: 'warning' },
            { name: 'info', selected: false, type: 'info' },
            { name: 'default', selected: true }
        ];

        this.items = [
            { label: 'Administrator', id: 'qwerty1' },
            { label: 'Advanced Viewer', id: 'qwerty2' },
            { label: 'Viewer', id: 'qwerty3' },
            { label: 'Live Viewer', id: 'qwerty4' }
            // { label: 'Administrator', id: 'qwerty11' },
            // { label: 'Advanced Viewer', id: 'qwerty12' },
            // { label: 'Viewer', id: 'qwerty13' },
            // { label: 'Live Viewer', id: 'qwerty14' },
            // { label: 'Administrator', id: 'qwerty21' },
            // { label: 'Advanced Viewer', id: 'qwerty22' },
            // { label: 'Viewer', id: 'qwerty23' },
            // { label: 'Live Viewer', id: 'qwerty24' },
        ];

        this.itemsSelected = ['qwerty2', 'qwerty3'];

        this.mode = [
            { name: 'Main', value: 'qwerty2' },
            { name: 'Backup', value: 'qwerty3' },
            { name: 'Not in use', value: 'qwerty4' }
        ];

        this.modeSelected = this.mode[2];

        // calculate dd size
        const btn = document.createElement('span');
        btn.style.visibility = 'hidden';
        btn.innerText = this.modeSelected.name;
        document.body.appendChild(btn);
        // add button's left and right padding and space for info icon
        this.ddWidth = Math.round(btn.getBoundingClientRect().width + 100);
    }

    constructor(private dialogs: NxDialogsService,
                private processService: NxProcessService,
                private sanitizer: DomSanitizer) {
        this.setupDefaults();
    }

    ngOnInit() {
        this.change = this.processService.createProcess(() => {
            return Promise.resolve(true);
        });

        this.restore = this.processService.createProcess(() => {
            return Promise.resolve(true);
        });
    }

    private touchForm(form) {
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

    modelChanged(result: any) {
        // ensure 'change' will be triggered
        this.itemsSelected = [...result];
    }

    notify(msg: string, type: string) {
        this.dialogs.notify(msg, type, this.autohide);
    }

    changeTheme(isEnabled, theme) {}
}
