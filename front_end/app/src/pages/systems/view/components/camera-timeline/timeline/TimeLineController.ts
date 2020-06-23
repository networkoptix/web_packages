import TimeRange from './timeRanges/TimeRange'

import setupCanvas from './utils/setupCanvas'

import RangerClass from './rangers/RangerClass'
import AbsoluteRanger from './rangers/absolute'
import AbstractRanger from './rangers/abstract/AbstractRanger'

import RulerClass from "./rulers/RulerClass"
import AbstractRuler from "./rulers/AbstractRuler"
// import StaticCanvasRuler from "./rulers/StaticCanvasRuler"
import AnimatedCanvasRuler from "./rulers/AnimatedCanvasRuler"

import AbstractScrollBar from './scrollBars/AbstractScrollBar'
import CanvasEmbeddedScrollBar from './scrollBars/CanvasEmbeddedScrollBar'

import AbstractScrollButtons from './scrollButtons/AbstractScrollButtons'
// import CanvasEmbeddedScrollButtons from './scrollButtons/CanvasEmbeddedScrollButtons'

import AbstractArchiveController from './archive/AbstractArchiveController'
import NaiveArchiveController from './archive/NaiveArchiveController'
import { timeStampMs, timeStampS } from './numberTypeAliases'

import * as screenfull from 'screenfull'
import AbstractEventBirdViewProvider from './archive/birdViews/providers/AbstractEventBirdViewProvider'


export class TimeLineController {

  protected ranger: AbstractRanger
  protected ctx: CanvasRenderingContext2D

  protected ruler: AbstractRuler
  protected scrollBar: AbstractScrollBar
  protected scrollButtons: AbstractScrollButtons
  protected archiveController: AbstractArchiveController

  constructor (
    protected containerId: string,
    protected archiveRange: TimeRange,
    protected archiveBirdViewProvider: AbstractEventBirdViewProvider,    
    protected embed: boolean = true,
    protected animate: boolean = false,
    protected rangerClass: RangerClass = AbsoluteRanger,
    protected rulerClass: RulerClass = AnimatedCanvasRuler,  // StaticCanvasRuler,
    protected debug: boolean = false,
  ) {

    this.registerScreenChangeEventHandlers()
    this.ctx = setupCanvas(containerId, true) // resize will shoot anyway, so this line is not obligatory

    this.ranger = new this.rangerClass(archiveRange, this.ctx, embed, animate) as AbsoluteRanger
    this.ruler = new this.rulerClass(this.ranger.visibleRange, this.ctx)
    this.scrollBar = new CanvasEmbeddedScrollBar(this.ranger.status, this.ranger.controls, this.canvas)
    // this.scrollButtons = new CanvasEmbeddedScrollButtons(this.ranger.status, this.ranger.controls, this.canvas)
    this.archiveController = new NaiveArchiveController(this.archiveRange, this.ranger.visibleRange, this.ctx, archiveBirdViewProvider)
  }

  protected registerScreenChangeEventHandlers () {
    if (screenfull.isEnabled) {
      screenfull.on('change', () => {
        setupCanvas(this.containerId, true)
      })
    }
    document.addEventListener('resize', () => setupCanvas(this.containerId, true))
    window.matchMedia('screen and (min-resolution: 2dppx)').addListener(e => {
      setupCanvas(this.containerId, true)
    });
  }

  public dispose () {
    console.log('timeline controller dispose start')
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ranger && this.ranger && this.ranger.dispose()
    this.ruler && this.ruler && this.ruler.dispose()
    this.scrollBar && this.scrollBar && this.scrollBar.dispose()
    this.scrollButtons && this.scrollButtons.dispose && this.scrollButtons.dispose()
    this.archiveController && this.archiveController.dispose && this.archiveController.dispose()
    console.log('timeline controller dispose end')
  }

  public render () {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ruler.render(this.debug)
    this.scrollBar.render(this.debug)
    // this.scrollButtons.render(this.debug)
    this.archiveController.render(this.debug)
  }

  public get canvas () {
    return this.ctx.canvas
  }

  public get rangerStatus () {
    return this.ranger.status
  }

  public get rangerControls () {
    return this.ranger.controls
  }

  public get visibleRange () {
    return this.ranger.visibleRange
  }

  public get fullRange () {
    return this.ranger.fullRange
  }

  public getNearestArchiveTime (time: timeStampMs): timeStampMs {
    return this.archiveController.getNearestTime(time)
  }
}

export default TimeLineController
