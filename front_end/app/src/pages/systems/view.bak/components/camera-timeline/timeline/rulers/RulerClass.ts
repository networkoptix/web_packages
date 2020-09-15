import AbstractRuler from './AbstractRuler'


export interface RulerClass {
  new (
    ...args: any[]
  ): AbstractRuler
}

export default RulerClass
