import { AsyncExecutor } from '../interfaces';
import { CancellationToken } from '../cancellation';
import { isTokenCanceled } from '../utils/cancellation-utils';
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
		onClose,
		shouldHandleError,
	}: {
		samplingDurationMs: number;
		failureThreshold: number;
		minimumThroughput: number;
		breakDurationMs: number;
		onOpen?: () => void;
		onClose?: () => void;
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
			const didTransition = this.transitionToState(closedState);
			if (didTransition && onClose) {
				onClose();
			}
		};
	}

	openCircuit: () => void;
	halfOpenCircuit: () => void;
	closeCircuit: () => void;
	shouldHandleError: (error: Error) => boolean;

	private _currentState: CircuitBreakerState;

	executeAsync(
		asyncFunc: (ct?: CancellationToken) => Promise<any>,
		cancellationToken?: CancellationToken
	): Promise<any> {
		if (!asyncFunc || typeof asyncFunc !== 'function') {
			throw new Error('asyncFunction must be provided.');
		}

		if (isTokenCanceled(cancellationToken)) {
			return Promise.resolve();
		}

		return this._currentState.executeAsync(asyncFunc, cancellationToken);
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
