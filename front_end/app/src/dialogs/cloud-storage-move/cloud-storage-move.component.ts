import { Component, Input, Renderer2, ViewChild, ElementRef } from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { NxConfigService }           from '../../services/nx-config/nx-config.service';
import { NxCloudApiService }         from '../../services/nx-cloud-api';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxProcessService }          from '../../services/process.service';
import { NxSystemService }           from '../../services/system.service';
import { NxSystemsService }          from '../../services/systems.service';
import { BehaviorSubject } from 'rxjs';
import { DropdownItem } from '../../components/dropdowns/generic/dropdown.component';
import { NxCloudStorageService } from '../../pages/systems/settings/cloud-storage/cloud-storage.service';

@Component({
    selector   : 'nx-cloud-storage-move-content',
    templateUrl: 'cloud-storage-move.component.html',
    styleUrls  : ['cloud-storage-move.component.scss']
})
export class CloudStorageMoveModalContent {
    LANG: any;
    CONFIG: any;

    items: DropdownItem[];
    errorText: string;

    @ViewChild('confirmMergeForm', { static: false }) mergeForm: HTMLFormElement;
    constructor(configService: NxConfigService,
        languageService: NxLanguageProviderService,
                public activeModal: NgbActiveModal,
                public renderer: Renderer2,
                private systemsService: NxSystemsService,
                private cloudStorageService: NxCloudStorageService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();
        this.items = mockItems;
        this.errorText = '';
    }

    move() {
        // need to write method
        console.log('wip');
        this.cloudStorageService.move('string', 'string').then(()=>{
            this.close();
        });
    }

    close() {
        this.activeModal.close();
    }

    setTargetSystem({ value }) {
        if (value === 'otherSystem') {
            this.errorText = "this isn't implemented, not sure if it should be";
        }

        this.systemsService.getSystem(value).toPromise().then(({ stateOfHealth }) => {
            if (stateOfHealth === 'offline') {
                this.errorText = 'Cloud storage cannot be moved to offline systems.';
            } else {
                this.errorText = '';
            }
        });
    }
}

const mockItems = [{ value: 'a9e17746-41df-438d-91a0-79f0fa644261', name: '<span>Docker VMS</span><span class="text-muted"> – offline</span>' },
    { value: '0dc2065d-f07d-4d4f-8346-a46f76ea3e99', name: '<span>kyle-vbox-2</span><span class="text-muted"> – offline</span>' },
    { value: 'a1e63ea3-c512-4e67-ab02-0f54090f87a7', name: '<span>kyle-VirtualBox-1</span><span class="text-muted"> – offline</span>' },
    { value: 'b57b279e-2cbb-4c98-8e26-c814cd349d49', name: '<span>Mac Server</span><span class="text-muted"> – offline</span>' },
    { name: 'horizontal' },
    { value: 'otherSystem', name: 'Other System...' }];
