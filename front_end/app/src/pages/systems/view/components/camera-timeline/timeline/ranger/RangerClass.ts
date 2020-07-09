import AbstractRanger from './AbstractRanger'


export interface RangerClass {
  new (
    ...args: any[]
  ): AbstractRanger
}

export default RangerClass
