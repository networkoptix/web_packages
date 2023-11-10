import { CommonModule } from '@angular/common';
import { booleanAttribute, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { Process } from '@services/process.service/process';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-auth-footer',
    templateUrl: './auth-footer.component.html',
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        NxProcessButtonComponent,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
    ],
})
export class AuthFooterComponent {
    protected readonly icons = icons;
    @Input({ required: true }) bindProcess: Process;
    @Input({ transform: booleanAttribute }) blockBack: boolean = false;
    @Input({ transform: booleanAttribute }) readyToBind: boolean = false;
    @Input() viewType: string;
    @Output() goBack = new EventEmitter<void>();
}
