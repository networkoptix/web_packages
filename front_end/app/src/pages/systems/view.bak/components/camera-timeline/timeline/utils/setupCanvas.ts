export const setupCanvas = (canvasId, useDPR: boolean = true): CanvasRenderingContext2D => {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * (useDPR ? devicePixelRatio : 1)
  canvas.height = rect.height * (useDPR ? devicePixelRatio : 1)
  return canvas.getContext('2d')
}

export default setupCanvas
