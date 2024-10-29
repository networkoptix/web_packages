import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import type { Downloads } from '@services/nx-cloud-api/nx-cloud-api.types';

@Component({
    selector: 'nx-release',
    templateUrl: 'release.component.html',
    styleUrls: ['release.component.scss'],
    standalone: true,
    imports: [PipesModule, TranslateModule, CommonModule],
})
export class ReleaseComponent implements OnInit {
    @Input() release: Downloads;
    @Input() linkbase: string;

    LANG = staticLang;

    cardExpanded: Record<string, boolean>;

    ngOnInit(): void {
        this.release.platforms.forEach(({ files }, i) => {
            this.release.platforms[i].files = files.filter(
                ({ appType }) =>
                    !['_debug', '_refs', '_update'].some(partialAppType =>
                        appType?.includes(partialAppType),
                    ),
            );
        });
        // Convert markdown code backticks to HTML <code> elements
        this.release.releaseNotes = this.release.releaseNotes.replace(
            /`(.*?)`/g,
            `<code class="nx-code">$1</code>`,
        );
        this.cardExpanded = Object.fromEntries(this.release.platforms.map(p => [p.name, false]));
    }
}
