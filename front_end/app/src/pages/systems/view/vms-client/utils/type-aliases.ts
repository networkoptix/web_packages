export type int = number
export type float = number

export type percentage = float

export type ms = number
export type px = number

export interface CanvasGeometry {
  width: px,
  height: px,
  dpr: int,
}
