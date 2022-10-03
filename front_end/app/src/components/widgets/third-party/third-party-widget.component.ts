import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { interval } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import { NxToastService } from '@dialogs/toast.service';
import { IConfig, NxConfigService } from '@services/nx-config';

import { FirstPartyWidget } from '../helper-classes';

@UntilDestroy()
@Component({
    selector: 'nx-third-party-widget',
    templateUrl: './third-party-widget.component.html',
    styleUrls: ['./third-party-widget.component.scss']
})
export class NxThirdPartyWidgetComponent extends FirstPartyWidget {
    CONFIG: IConfig;
    static IDENTIFIER = 'third-party';
    static NAME = 'Third Party';
    static SIZES = [
        { name: '2 x 2', value: { cols: 2, rows: 2 } },
        { name: '2 x 4', value: { cols: 2, rows: 4 } },
        { name: '4 x 2', value: { cols: 4, rows: 2 } },
        { name: '4 x 4', value: { cols: 4, rows: 4 } },
        { name: '4 x 6', value: { cols: 4, rows: 6 } }
    ]

    static sharedState$;

    static BASE_CONFIG = {
        useSourceUrl: false,
        sourceUrl: '',
        source: '',
        editSource: ''
    }

    static MAX_SIZE = 250000;

    passStateToIframe(frame) {
        frame.contentWindow.sharedState = NxThirdPartyWidgetComponent.sharedState$;
        const editableSource = frame.contentDocument.querySelector('pre#plain-text-editable');
        if (editableSource) {
            editableSource.addEventListener('blur', ({ target: { innerText } }) => {
                this.card.config.editSource = `<pre id="plain-text-editable" contenteditable>${innerText}</pre>`;
                this.card.config.source = `<pre id="plain-text-editable" contenteditable>${innerText}</pre>`;
                this.saveSettings();
            });
        } else if (this.card.config.sourceUrl) {
            frame.src = this.card.config.sourceUrl;
        }
    }

    fileLeave() {
        console.log('leave');
    }

    fileDropped = (files) => {
        const fileEntry = files[0].fileEntry;
        const fileReader = new FileReader();
        let otherName;
        let image;
        fileReader.onload = _ => {
            const result = fileReader.result as string;
            let parsed;
            let card;
            try {
                parsed = atob(result);
            } catch (_) {
                parsed = result;
            }
            try {
                card = JSON.parse(parsed);
                if (!card.name || !card.sizes || !card.source) {
                    throw new Error('Not a valid widget file');
                }
            } catch (err) {
                console.error(err);
                const source = image ? `<img alt="Embedded Image" src="${result}" style="width: 100%; font-size: inherit;"/>` : otherName.endsWith('.html') || otherName.endsWith('.htm') ? result : `<pre id="plain-text-editable" contenteditable>${result}</pre>`;
                card = {
                    name: image,
                    sizes: NxThirdPartyWidgetComponent.SIZES,
                    editSource: source,
                    source
                };
            }
            const { name, sizes: baseSizes, ...config } = card;
            this.card.title = name || otherName;
            this.card.sizes = baseSizes.map(({ name, value }) => ({ name: `${this.card.title} (${name})`, value }));
            const { cols: curCols = 0, rows: curRows = 0 } = this.card.size.value;
            this.card.size = this.card.sizes.find(({ value: { cols, rows } }) => cols === curCols && rows === curRows) || this.card.sizes[0];
            this.card.config = config;
            this.saveSettings();
        };

        fileEntry.file((file: File) => {
            const options = {
                classname: this.CONFIG.toast.warning,
                autohide: true,
                delay: this.CONFIG.alertTimeout
            };

            if (file instanceof DataTransferItem) {
                this.toastService.show('Please upload a valid .wgt, .html, image, or text file.', options);
                return;
            }

            if (!file.name.endsWith('.wgt') && file.size > NxThirdPartyWidgetComponent.MAX_SIZE) {
                this.toastService.show('File is not a valid widget format and is to large to render', options);
                return;
            }

            if (file.type.startsWith('image')) {
                image = file.name;
                fileReader.readAsDataURL(file);
            } else {
                fileReader.readAsText(file);
                otherName = file.name;
            }
        });
    }

    useSourceUrl = () => {
        this.card.sizes = NxThirdPartyWidgetComponent.SIZES.map(({ name, ...config }) => ({ name: `${this.card.title} (${name})`, ...config }));
        this.card.size = this.card.sizes[this.card.sizes.length - 2];
        this.card.config.useSourceUrl = false;
        this.saveSettings();
    }

    switchUploadSource = () => {
        this.card.config.useSourceUrl = !this.card.config.useSourceUrl;
        this.card.config.sourceUrl = '';
        this.card.title = NxThirdPartyWidgetComponent.NAME;
    }

    constructor(
        configService: NxConfigService,
        cd: ChangeDetectorRef,
        private toastService: NxToastService
    ) {
        super(cd);
        this.CONFIG = configService.config;

        NxThirdPartyWidgetComponent.sharedState$ ||= interval(1000).pipe(
            map(time => `Shared state from cloud portal: ${time}`),
            shareReplay(1)
        );
    }
}

NxThirdPartyWidgetComponent.registerWidget();
