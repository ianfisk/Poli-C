import { CircuitBreakerPolicy } from '..';
import { CircuitBreakerState } from '.';

export class OpenCircuitBreakerState implements CircuitBreakerState {
	constructor(circuitBreaker: CircuitBreakerPolicy, breakDurationMs: number) {
		this._circuitBreaker = circuitBreaker;
		this._breakDurationMs = breakDurationMs;
	}

	private _circuitBreaker: CircuitBreakerPolicy;
	private _breakDurationMs: number;

	enter() {
		setTimeout(() => {
			this._circuitBreaker.halfOpenCircuit();
		}, this._breakDurationMs);
	}

	executeAsync() {
		return Promise.reject(new Error('circuitBreakerOpen'));
	}
}
