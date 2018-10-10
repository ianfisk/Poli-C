import { AsyncExecutor } from '../interfaces';
import {
	CircuitBreakerState,
	OpenCircuitBreakerState,
	HalfOpenCircuitBreakerState,
	ClosedCircuitBreakerState,
} from './states';

export class CircuitBreakerPolicy implements AsyncExecutor {
	constructor({
		samplingDurationMs,
		failureThreshold,
		minimumThroughput,
		breakDurationMs,
		onOpen,
		shouldHandleError,
	}: {
		samplingDurationMs: number;
		failureThreshold: number;
		minimumThroughput: number;
		breakDurationMs: number;
		onOpen?: () => void;
		shouldHandleError?: (error: Error) => boolean;
	}) {
		this.shouldHandleError = shouldHandleError || (() => true);

		const openState = new OpenCircuitBreakerState(this, breakDurationMs);
		const halfOpenState = new HalfOpenCircuitBreakerState(this);
		const closedState = new ClosedCircuitBreakerState(
			this,
			samplingDurationMs,
			failureThreshold,
			minimumThroughput
		);

		this._currentState = closedState;
		this.openCircuit = () => {
			const didTransition = this.transitionToState(openState);
			if (didTransition && onOpen) {
				onOpen();
			}
		};

		this.halfOpenCircuit = () => {
			this.transitionToState(halfOpenState);
		};

		this.closeCircuit = () => {
			this.transitionToState(closedState);
		};
	}

	openCircuit: () => void;
	halfOpenCircuit: () => void;
	closeCircuit: () => void;
	shouldHandleError: (error: Error) => boolean;

	private _currentState: CircuitBreakerState;

	executeAsync(asyncFunc: () => Promise<any>): Promise<any> {
		if (!asyncFunc || typeof asyncFunc !== 'function') {
			throw new Error('asyncFunction must be provided.');
		}

		return this._currentState.executeAsync(asyncFunc);
	}

	private transitionToState(newState: CircuitBreakerState): boolean {
		if (this._currentState !== newState) {
			this._currentState = newState;
			this._currentState.enter();

			return true;
		}

		return false;
	}
}
