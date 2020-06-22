import AbstractRanger from './abstract/AbstractRanger'


export interface RangerClass {
  new (
    ...args: any[]
  ): AbstractRanger
}

export default RangerClass
