import IRangerStatus from '../ranger/IRangerStatus'
import IRangerControls from '../ranger/IRangerControls'


export abstract class AbstractScrollButtons {

  constructor (
    protected status: IRangerStatus,
    protected controls: IRangerControls,
  ) {
    // this.bindEventHandlers()
  }

  public dispose () {
    this.unbindEventHandlers()
  }

  protected abstract bindEventHandlers ()
  protected abstract unbindEventHandlers ()

  public abstract render (debug: boolean)
}

export default AbstractScrollButtons
