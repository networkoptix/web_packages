import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxToastService } from '@dialogs/toast.service';
import { SharedWidgetState } from '@lib/dashboard-widget-state';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystemsService } from '@services/systems.service';

import { FirstPartyWidget } from '../helper-classes';

@UntilDestroy()
@Component({
    selector: 'nx-third-party-widget',
    templateUrl: './third-party-widget.component.html',
    styleUrls: ['./third-party-widget.component.scss']
})
export class NxThirdPartyWidgetComponent extends FirstPartyWidget<
    typeof NxThirdPartyWidgetComponent.BASE_CONFIG
> {
    CONFIG: IConfig;
    static IDENTIFIER = 'third-party';
    static NAME = 'Third Party';
    static SIZES = [
        { name: '2 x 2', value: { cols: 2, rows: 2 } },
        { name: '2 x 4', value: { cols: 2, rows: 4 } },
        { name: '4 x 2', value: { cols: 4, rows: 2 } },
        { name: '4 x 4', value: { cols: 4, rows: 4 } },
        { name: '4 x 6', value: { cols: 4, rows: 6 } }
    ];

    static sharedState$: SharedWidgetState;

    static BASE_CONFIG = {
        useSourceUrl: false,
        sourceUrl: '',
        source: '',
        editSource: '',
        devMode: false
    };

    static MAX_SIZE = 250000;

    passStateToIframe(frame): void {
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

    fileLeave(): void {
        console.log('leave');
    }

    fileDropped = (files): void => {
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
            if (file instanceof DataTransferItem) {
                this.toastService.notify(
                    'Please upload a valid .wgt, .html, image, or text file.',
                    this.CONFIG.toast.warning,
                );
                return;
            }

            if (!file.name.endsWith('.wgt') && file.size > NxThirdPartyWidgetComponent.MAX_SIZE) {
                this.toastService.notify(
                    'File is not a valid widget format and is to large to render',
                    this.CONFIG.toast.warning,
                );
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
    };

    useSourceUrl = (): void => {
        this.card.sizes = NxThirdPartyWidgetComponent.SIZES.map(({ name, ...config }) => ({ name: `${this.card.title} (${name})`, ...config }));
        this.card.size = this.card.sizes[this.card.sizes.length - 2];
        this.card.config.useSourceUrl = false;
        this.saveSettings();
    };

    switchUploadSource = (): void => {
        this.card.config.useSourceUrl = !this.card.config.useSourceUrl;
        this.card.config.sourceUrl = '';
        this.card.title = NxThirdPartyWidgetComponent.NAME;
    };

    constructor(
        configService: NxConfigService,
        cd: ChangeDetectorRef,
        private toastService: NxToastService,
        systemsService: NxSystemsService,
        router: Router,
    ) {
        super(cd);
        this.CONFIG = configService.config;
        NxThirdPartyWidgetComponent.sharedState$ ||= new SharedWidgetState(
            systemsService.systemsSubject.asObservable() as any,
            () => systemsService.forceUpdateSystems() as any,
            url => router.navigateByUrl(url));
    }
}

NxThirdPartyWidgetComponent.registerWidget();
