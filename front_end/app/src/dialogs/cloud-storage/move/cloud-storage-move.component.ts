import {
    Component,
    Renderer2,
    ViewChild,
    Input,
    OnInit,
    Injector
}                                    from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { NxConfigService, IConfig }  from '../../../services/nx-config';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { NxSystemsService }          from '../../../services/systems.service';
import { DropdownItem }              from '../../../components/dropdowns/generic/dropdown.component';
import { LanguageI18NStaticTypes }   from '../../../../language_i18n_static_types';
import { NxCloudApiService }         from '../../../services/nx-cloud-api';
import { NxProcessService }          from '../../../services/process.service';
import { BehaviorSubject }           from 'rxjs';
import { NxSystem }                  from '../../../services/system.service';
import { NxDialogsService }          from '../../dialogs.service';

@Component({
    selector    : 'nx-cloud-storage-move-content',
    templateUrl : 'cloud-storage-move.component.html',
    styleUrls   : ['cloud-storage-move.component.scss']
})
export class CloudStorageMoveModalContent implements OnInit {
    @Input() system$: BehaviorSubject<NxSystem>;
    @Input() updateCallback: () => void;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    targetSystems: DropdownItem[];
    target$: BehaviorSubject<string>;
    errorText: string;
    systemId = '';
    userEmail = '';

    showNoOtherSystems = false;

    @ViewChild('moveForm') moveForm: HTMLFormElement;
    constructor(configService: NxConfigService,
        languageService: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        public renderer: Renderer2,
        private systemsService: NxSystemsService,
        private processService: NxProcessService,
        private cloudApiService: NxCloudApiService,
        private injector: Injector
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();

        this.targetSystems = [];
        this.errorText = '';
    }

    ngOnInit() {
        this.system$.subscribe(system => {
            this.systemId = system.id;
            this.userEmail = system.currentUserEmail;
            this.systemsService.getMySystems(this.userEmail, this.systemId);
            this.systemsService.systemsSubject.subscribe((systems: any[]) => {
                // Generate dropdown items
                const processedSystems = systems.filter(({ id }) => id !== this.systemId).map(({ id: value, name, stateOfHealth }) => ({
                    value,
                    name: `<span>${name}</span><span class="${stateOfHealth === 'offline' ? 'text-muted' : ''}"> – ${stateOfHealth}</span>`
                }));

                const otherSystems = [{ name: 'horizontal' }, { value: 'otherSystem', name: 'Other System...' }];
                this.targetSystems = [...processedSystems, ...otherSystems];
                this.target$ = new BehaviorSubject(this.targetSystems[0].value);
                if (systems && this.targetSystems.length <= 2) {
                    // Display noOtherSystemsError when only system
                    this.close();
                    const { dialogs: { cloudStorage:{ noOtherSystemsError: { message }, moveCloudStorage: { title } }, buttons: { ok } } } = this.LANG;
                    this.injector.get(NxDialogsService).confirm(message, title, ok);
                };
            });
        });
    }

    public get currentTarget() {
        return this.target$.value;
    }

    public move = this.processService.createProcess(() => {
        return this.cloudApiService.moveCloudStorage(this.systemId, this.currentTarget)
            .then(() => {
                this.updateCallback();
                this.close();
            });
    }, {
        // TODO: Need to handle whatever errors I can here
        successMessage : 'Storage Succesfully moved',
        errorPrefix    : 'Cloud Storage Move Error'
    })

    close() {
        this.activeModal.close();
    }

    setTargetSystem({ value }) {
        this.target$.next(value);
        if (value === 'otherSystem') {
            // TODO: Moving to a system that isn't already setup on cloud wasn't in spec, should it be implemented?
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
