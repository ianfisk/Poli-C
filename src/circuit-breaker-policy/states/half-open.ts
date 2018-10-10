import { CircuitBreakerPolicy } from '..';
import { CircuitBreakerState } from '.';

export class HalfOpenCircuitBreakerState implements CircuitBreakerState {
	constructor(circuitBreaker: CircuitBreakerPolicy) {
		this._circuitBreaker = circuitBreaker;
	}

	private _circuitBreaker: CircuitBreakerPolicy;
	private _isInvoking = false;

	enter() {
		this._isInvoking = false;
	}

	async executeAsync(asyncFunc: () => Promise<any>): Promise<any> {
		if (this._isInvoking) {
			throw new Error('circuitBreakerOpen');
		}

		this._isInvoking = true;

		try {
			const result = await asyncFunc();
			this._circuitBreaker.closeCircuit();

			return result;
		} catch (error) {
			if (this._circuitBreaker.shouldHandleError(error)) {
				this._circuitBreaker.openCircuit();
			}

			throw error;
		}
	}
}
