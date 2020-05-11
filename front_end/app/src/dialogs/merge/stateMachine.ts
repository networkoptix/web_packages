interface StateMachine {
    currentState: string;
    state;
    store;
    history: string[];
}

class StateMachine {
    constructor(initialState, store) {
        this.store = store;
        this.currentState = initialState;
        this.state = this.store[this.currentState];
        this.history = [];
    }

    transition(newState, goingBack = false) {
        const nextState = this.store[newState];
        if (!nextState) {
            throw new Error(`invalid: ${this.state} -> ${newState}`);
        }
        if (!goingBack) {
            this.history.push(this.currentState);
        }
        this.currentState = newState;
        this.state = nextState;
    }

    goBack() {
        for (const variable in this.state.template) {
            if (variable.includes('Error')) {
                this.state.template[variable] = '';
            }
        }
        if (this.history.length > 0) {
            this.transition(this.history.pop(), true);
        } else {
            throw new Error('Nothing to go back to');
        }
    }
}

export default StateMachine;
