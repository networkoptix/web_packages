import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'nx-dialogs-sandbox',
    templateUrl: 'dialogs-sandbox.component.html',
    styleUrls: ['dialogs-sandbox.component.scss'],
    standalone: true,
    imports: [CommonModule, TranslateModule],
})
export class NxDialogsSandboxComponent implements OnInit {
    ngOnInit(): void {}

    close(): void {}

    closable = true;
}
