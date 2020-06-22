import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core'

// import { NxSystem, NxCamera } from '../../../../../../../services/system.service'

import * as Hls from 'hls.js'
import { timeStampMs } from '../camera-timeline/timeline/numberTypeAliases'
import { NxSystem, NxCamera } from '../../../../../services/system.service'
import { PlaybackQuality } from '../../view.types'


@Component({
    selector: 'nx-camera-hls-player',
    templateUrl: 'NxCameraHlsPlayer.component.html',
    styleUrls: [
        'NxCameraHlsPlayer.component.scss',
    ],
})
// @ts-ignore
export class NxCameraHlsPlayer implements OnChanges, OnInit, OnDestroy {

    // // TODO: REMOVE AFTER DEBUG!
    // protected notYetStartedOnce: boolean = false

    @Input() system: NxSystem
    @Input() camera: NxCamera
    @Input() startTime: timeStampMs
    @Input() quality: PlaybackQuality
    
    // @ts-ignore
    @Input() shouldPlay: boolean

    @Output() playbackStarted: EventEmitter<timeStampMs> = new EventEmitter();
    // @Output() playbackStopped: EventEmitter<timeStampMs> = new EventEmitter();

    // there are two players
    // @ts-ignore
    @ViewChild('videoOdd', { static: true }) videoOdd: ElementRef;
    // @ts-ignore
    @ViewChild('videoEven', { static: true }) videoEven: ElementRef;
    protected hlsHandlerOdd: Hls
    protected hlsHandlerEven: Hls
    // so we can cycle between them
    protected playbackChangesCounter: number = 0

    public get isOddVideoActive (): boolean {
        return !(this.playbackChangesCounter % 2)
    }
    public get isEvenVideoActive (): boolean {
        return !this.isOddVideoActive
    }
    protected get currentVideo (): ElementRef {
        return this.isOddVideoActive ? this.videoOdd : this.videoEven
    }
    protected get nextVideo (): ElementRef {
        return this.isOddVideoActive ? this.videoEven : this.videoOdd
    }
    protected get currentHlsHandler (): Hls {
        return this.isOddVideoActive ? this.hlsHandlerOdd : this.hlsHandlerEven
    }
    protected get nextHlsHandler (): Hls {
        return this.isOddVideoActive ? this.hlsHandlerEven : this.hlsHandlerOdd
    }
    protected set currentHlsHandler (h: Hls) {
        if (this.isOddVideoActive) {
            this.hlsHandlerOdd = h
        } else {
            this.hlsHandlerEven = h
        }
    }
    protected set nextHlsHandler (h: Hls) {
        if (this.isOddVideoActive) {
            this.hlsHandlerEven = h
        } else {
            this.hlsHandlerOdd = h
        }
    }

    public isVideoLoading: boolean = false

    constructor (
    ) {
        // this.layerControl.init()
    }

    public ngOnInit () {
    }

    public ngOnDestroy () {
        this.hlsHandlerEven && this.hlsHandlerEven.destroy()
        this.hlsHandlerOdd && this.hlsHandlerOdd.destroy()
    }

    // protected layerControl = {
    //     init: () => {
    //         this.currentVideo = this.video2
    //         this.currentHlsHandler = this.hlsHandler2
    //         this.nextVideo = this.video1
    //         this.nextHlsHandler = this.hlsHandler1
    //     },
    //     switch: () => {
    //         const tmpElementRef = this.currentVideo
    //         const tmpHlsHandler = this.currentHlsHandler
    //         this.currentVideo = this.nextVideo
    //         this.currentHlsHandler = this.nextHlsHandler
    //         this.nextVideo = tmpElementRef
    //         this.nextHlsHandler = tmpHlsHandler
    //         this.nextHlsHandler && this.nextHlsHandler.destroy()
    //         this.nextVideo.nativeElement.src = ''
    //     }
    // }

    public ngOnChanges (changes: SimpleChanges) {
        if (changes.camera || changes.startTime || changes.quality) {
            this.changePlaybackSource()
        }
        if (changes.shouldPlay) {
            const video = this.currentVideo.nativeElement as HTMLVideoElement
            if (this.shouldPlay) {
                video.play()
            } else if (!changes.startTime) {
                video.pause()
            }
        }
    }

    public changePlaybackSource () {
      if (!this.startTime) {
        this.currentVideo.nativeElement.src = ''
        this.nextVideo.nativeElement.src = ''
        if (this.currentHlsHandler) this.currentHlsHandler.destroy()
        if (this.nextHlsHandler) this.nextHlsHandler.destroy()
        return
      }

        // console.log('changePlaybackSource', this.startTime === -1 ? 'Live' : `Archive at ${this.startTime}`)
        // if (!this.nextVideo) {
        //     console.log('nextVideo is empty, trying again after a while')
        //     setTimeout(() => this.changePlaybackSource(), 50)
        //     return
        // }
        const video = this.nextVideo.nativeElement
        video.src = ''
        if (this.nextHlsHandler) this.nextHlsHandler.destroy()

        this.isVideoLoading = true

        // setTimeout(() => {
        //   ////// fake HLS request start
        //   const startTime = Math.round((this.startTime / 1000) % (24 * 60 * 60))
        //   const duration = 700
        //   const videoSrc = `http://127.0.0.1:5000/${startTime}/${duration}/`
        //   // console.log(startTime, duration, videoSrc)
        //   if (Hls.isSupported()) {
        //     const hlsHandler = new Hls()
        //     hlsHandler.loadSource(videoSrc)
        //     hlsHandler.attachMedia(video)
        //     hlsHandler.on(Hls.Events.MEDIA_ATTACHED, () => {
        //       // console.log('media attached')
        //     })
        //     hlsHandler.on(Hls.Events.MANIFEST_PARSED, function() {
        //       // console.log('manifest parsed')
        //       video.play()
        //     });
        //     let playbackStarted = false
        //     hlsHandler.on(Hls.Events.FRAG_LOADED, () => {
        //       if (playbackStarted)
        //         return
        //       playbackStarted = true
        //       this.currentHlsHandler && this.currentHlsHandler.destroy()
        //       this.currentVideo.nativeElement.src = ''
        //       this.playbackChangesCounter++
        //       this.isVideoLoading = false
        //       // console.log('fragment loaded, playback started', this.playbackChangesCounter)
        //       // if (!this.notYetStartedOnce) {
        //       //   this.notYetStartedOnce = true
        //         this.playbackStarted.emit(this.startTime)
        //       // }
        //     })
        //   }
        //   ////// fake HLS request end
        // }, 1000)

        const cameraId = this.camera.id
        const startTime = this.startTime
        const resolution = this.quality === 'high' ? 'hi' : 'lo'
        this.system.getHlsUrl(cameraId, startTime, resolution).then(
          manifestUrl => {
            console.log(`manifestUrl loaded for camera ${cameraId} and time ${startTime}: ${manifestUrl}`)
            const hlsHandler = new Hls()
            this.nextHlsHandler = hlsHandler
            let playbackStarted = false
            hlsHandler.attachMedia(video)
            hlsHandler.loadSource(manifestUrl)
            hlsHandler.on(Hls.Events.MEDIA_ATTACHED, () => {
              console.log('media attached')
            })
            hlsHandler.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
              console.log('manifest loaded')
              video.play()
            })
            hlsHandler.on(Hls.Events.FRAG_LOADED, () => {
              if (playbackStarted)
                return
              playbackStarted = true
              this.currentHlsHandler && this.currentHlsHandler.destroy()
              this.currentVideo.nativeElement.src = ''
              this.playbackChangesCounter++
              this.isVideoLoading = false
              console.log('fragment loaded, playback started', this.playbackChangesCounter)
              this.playbackStarted.emit(startTime)
            })
        },
        rejection => {
          console.error(`system.getHlsUrl for camera ${cameraId} and time ${startTime} was rejected`)
          this.isVideoLoading = true
        }
      )
    }
}

export default NxCameraHlsPlayer
