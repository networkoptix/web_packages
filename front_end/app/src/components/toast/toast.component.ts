import { Component, TemplateRef, Input, HostBinding, OnInit }              from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { NxToastService }                      from '../../dialogs/toast.service';
import { NxConfigService, IConfig } from '../../services/nx-config';

@Component({
    selector  : 'app-toasts',
    templateUrl  : 'toast.component.html',
    styleUrls : ['toast.component.scss'],
    host      : { '[class.nx-toasts]': 'true' },
    animations : [
        trigger('fadeInOut', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('.2s ease-in', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('.5s ease-out', style({ opacity: 0 }))
            ])
        ])
    ]
})
export class ToastsContainer implements OnInit {
    CONFIG: IConfig;
    warningSvgPath = ''
    errorSvgPath = ''

    @Input() inset = false;
    @HostBinding() class = '';
    @HostBinding('@.disabled') animationDisabled = false;

    constructor(configService: NxConfigService, public toastService: NxToastService) {
        this.CONFIG = configService.getConfig();
        this.warningSvgPath = `${this.CONFIG.icons.dirNonStandard}warning.svg`;
        this.errorSvgPath = `${this.CONFIG.icons.dirNonStandard}error.svg`;
    }

    ngOnInit() {
        this.class = this.inset ? 'inset-toasts' : 'nx-toasts';
        this.animationDisabled = this.inset;
    }

    isTemplate(toast) {
        return toast.textOrTpl instanceof TemplateRef;
    }

    remove(toast) {
        this.toastService.remove(toast);
    }
}
