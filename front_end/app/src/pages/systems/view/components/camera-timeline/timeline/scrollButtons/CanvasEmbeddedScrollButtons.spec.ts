import CanvasEmbeddedScrollButtons from './CanvasEmbeddedScrollButtons'
import RangerStatus from '../ranger/RangerStatus'
import RangerControls from '../ranger/RangerControls'
import { int, uint } from '../basic_types/numbers'

describe('Ranger', () => {
  
  let mockStatus: RangerStatus
  let mockControls: RangerControls
  let mockCanvas: HTMLCanvasElement
  let mockCtx: CanvasRenderingContext2D
  let sb: CanvasEmbeddedScrollButtons
  
  beforeEach(() => {

    if (typeof(requestAnimationFrame) === 'undefined') {
      let framesRendered = 0
      const frameLimit = 1
      global.requestAnimationFrame = (callback: FrameRequestCallback) => {
        if (framesRendered++ < frameLimit) {
          callback(Date.now());
        }
        return 1
      }
    }
    spyOn(global, 'requestAnimationFrame')

    mockStatus = <RangerStatus>{
      zoom: {
        isMax: false,
        isMin: true,
        factor: 1.0,
      },
      scroll: {
        offset: {
          relative: 0.0,
          absolute: 0,
        },
        isMax: true,
        isMin: true,
      },
      resolution: {
        pxPerMs: 1/10,
        msPerPx: 10
      }
    }

    mockControls = <RangerControls>{

    }

    mockCanvas = <HTMLCanvasElement> {
      addEventListener: (event: string, handler: (e: Event) => boolean) => void {},
      removeEventListener: (event: string, handler: (e: Event) => boolean) => void {},
      getContext (v: '2d') {
        return mockCtx
      },
      width: 1000,
      height: 100,
    }
    spyOn(mockCanvas, 'addEventListener')
    spyOn(mockCanvas, 'removeEventListener')

    // @ts-ignore
    mockCtx = <CanvasRenderingContext2D> {
      canvas: mockCanvas,
      fillStyle: 'original-fill-style',
      // strokeStyle: 'original-stroke-style',
      fillRect (x: int, y: int, w: uint, h: uint) {},
      // beginPath () {},
      // moveTo (x: int, y: int) {},
      // lineTo (x: int, y: int) {},
      // stroke () {},
    }
    spyOnAllFunctions(mockCtx)
    
    sb = new CanvasEmbeddedScrollButtons(mockStatus, mockControls, mockCanvas)
  });

  it('bootstraps correctly', () => {
    expect(typeof CanvasEmbeddedScrollButtons).toEqual('function')

    expect(mockCanvas.addEventListener).toHaveBeenCalledTimes(1)
    expect(mockCanvas.removeEventListener).toHaveBeenCalledTimes(0)    
    
    sb.dispose()
    expect(mockCanvas.addEventListener).toHaveBeenCalledTimes(1)
    expect(mockCanvas.removeEventListener).toHaveBeenCalledTimes(1)
  })

  it('seems to register progress handler', () => {
    expect(global.requestAnimationFrame).toHaveBeenCalledTimes(1)
  })

  it('seems to render correctly', () => {
    sb.render()    
    expect(mockCtx.fillRect).toHaveBeenCalledTimes(0)

    mockStatus.scroll.isMax = false
    sb.render()
    expect(mockCtx.fillRect).toHaveBeenCalledTimes(1)

    mockStatus.scroll.isMin = false
    sb.render()
    expect(mockCtx.fillRect).toHaveBeenCalledTimes(3)

    mockStatus.scroll.isMax = true
    sb.render()
    expect(mockCtx.fillRect).toHaveBeenCalledTimes(4)

    mockStatus.scroll.isMin = true
    sb.render()
    expect(mockCtx.fillRect).toHaveBeenCalledTimes(4)    
  })
})
