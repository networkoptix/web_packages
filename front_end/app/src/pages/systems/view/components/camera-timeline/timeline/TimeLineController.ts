import TimeRange from './time_range/TimeRange'

import setupCanvas from './utils/setupCanvas'

import Ranger from './ranger/Ranger'
// import AbstractRanger from './ranger/AbstractRanger'

import AbstractRuler from "./rulers/AbstractRuler"
import StaticCanvasRuler from "./rulers/StaticCanvasRuler"
// import AnimatedCanvasRuler from "./rulers/AnimatedCanvasRuler"

import AbstractScrollBar from './scrollBars/AbstractScrollBar'
import CanvasEmbeddedScrollBar from './scrollBars/CanvasEmbeddedScrollBar'

import AbstractScrollButtons from './scrollButtons/AbstractScrollButtons'

import AbstractArchiveController from './archive/AbstractArchiveController'
import NaiveArchiveController from './archive/NaiveArchiveController'
import { timeStampMs } from './basic_types/time'

import * as screenfull from 'screenfull'
import AbstractEventBirdViewProvider from './archive/birdViews/providers/AbstractEventBirdViewProvider'

import EmbeddedWheelZoom from './embedded/EmbeddedWheelZoom'
import EmbeddedWheelScroll from './embedded/EmbeddedWheelScroll'


export class TimeLineController {

  protected ranger: Ranger
  protected ctx: CanvasRenderingContext2D

  protected ruler: AbstractRuler
  protected scrollBar: AbstractScrollBar
  protected scrollButtons: AbstractScrollButtons
  protected archiveController: AbstractArchiveController

  protected embeddedWheelZoom: EmbeddedWheelZoom
  protected embeddedWheelScroll: EmbeddedWheelScroll

  constructor (
    protected containerId: string,
    protected archiveRange: TimeRange,
    protected archiveBirdViewProvider: AbstractEventBirdViewProvider,    
    protected embed: boolean = true,
    protected animate: boolean = false,
    protected debug: boolean = false,
  ) {

    this.registerScreenChangeEventHandlers()
    this.ctx = setupCanvas(containerId, true) // resize will shoot anyway, so this line is not obligatory

    this.ranger = new Ranger(archiveRange, this.ctx.canvas.width, animate)
    
    this.ruler = new StaticCanvasRuler(this.ranger.visibleRange, this.ctx)
    // this.ruler = new AnimatedCanvasRuler(this.ranger.visibleRange, this.ctx)
    
    this.scrollBar = new CanvasEmbeddedScrollBar(this.ranger.status, this.ranger.controls, this.canvas)
    this.archiveController = new NaiveArchiveController(this.archiveRange, this.ranger.visibleRange, this.ctx, archiveBirdViewProvider)

    if (embed) {
      this.embeddedWheelZoom = new EmbeddedWheelZoom(
        this.canvas,
        this.ranger.status,
        this.ranger.controls,
      )

      this.embeddedWheelScroll = new EmbeddedWheelScroll(
        this.canvas,
        this.ranger.status,
        this.ranger.controls,
      )
    }
  }

  protected registerScreenChangeEventHandlers () {
    if (screenfull.isEnabled) {
      screenfull.on('change', () => {
        setupCanvas(this.containerId, true)
      })
    }
    window.addEventListener('resize', () => {
      setupCanvas(this.containerId, true)
      this.ranger.canvasWidth = this.ctx.canvas.width
      // console.debug('window resized, canvas width changed', this.ctx.canvas.width)
    })
    window.matchMedia('screen and (min-resolution: 2dppx)').addListener(e => {
      setupCanvas(this.containerId, true)
      this.ranger.canvasWidth = this.ctx.canvas.width
      // console.debug('media resolution (pixel density), canvas width changed', this.ctx.canvas.width)
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
    
    this.embeddedWheelZoom && this.embeddedWheelZoom.dispose()
    this.embeddedWheelScroll && this.embeddedWheelScroll.dispose()
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
