import { AfterViewInit, Component, Input } from '@angular/core';
import { NxConfigService, IConfig } from '@services/nx-config';
import { Platform } from '@angular/cdk/platform';
import { NxLandingService } from '../landing.service';

interface layer {
    scale : number
    path  : string
}

@Component({
    selector    : 'nx-background-graphic',
    templateUrl : './background-graphic.component.html',
    styleUrls   : ['./background-graphic.component.scss']
})
export class NxBackgroundGraphicComponent implements AfterViewInit {
  @Input() scrollPosition: number
  CONFIG: IConfig;
  componentInitialized = false;
  isSafari: boolean;
  layers: layer[] = [];

  graphicPaths = ['1', '2', '3', '4', '5', '6', '7', 'contrast']

  svgProperties = {
      defaultWidth  : 1920,
      defaultHeight : 1080
  }

  calculationProperties = {
      scrollSpeedCoefficient   : 0.0005,
      layerDistanceCoefficient : 0.00005
  }

  constructor(configService: NxConfigService, platform: Platform, public landingService: NxLandingService) {
      this.CONFIG = configService.getConfig();
      for (const graphic of this.graphicPaths) {
          this.layers.push({
              path  : 'land_layer_' + graphic + '.svg',
              scale : 0.5
          });
      }
      this.isSafari = platform.SAFARI;
  }

   // Calculates the size of the backgrounGraphics
   layerSize = (original: number, layer: number) => {
       return (original / (1 - (this.scrollPosition * (this.calculationProperties.scrollSpeedCoefficient + (this.calculationProperties.layerDistanceCoefficient * layer))))) * 4;
   }

   // Converts layer size to scale
   getScale = (layer: number) => {
       return (this.layerSize(this.svgProperties.defaultWidth, layer) / (this.svgProperties.defaultWidth)) * 0.25;
   }

   recalculateScale = () => {
       for (let i = 0; i < this.layers.length; i++) {
           let currLayer: number;
           if (i !== this.layers.length - 1) {
               currLayer = i + 1;
           } else {
               // This is so that the contrast layer's size coefficient is 1
               currLayer = 1;
           }
           this.layers[i].scale = this.getScale(currLayer);
       }
   }

   ngAfterViewInit() {
       setTimeout(() => {
           // Component initialized is used to prevent svg from flickering into existence on initial render
           this.componentInitialized = true;
           this.landingService.backgroundGraphicFinishedLoading$.next(true);
       }, 0);
   }

   ngOnChanges() {
       this.recalculateScale();
   }
}
