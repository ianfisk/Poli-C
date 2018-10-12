import { CancellationToken } from '../../cancellation';
import { SlidingTimeWindow } from '../../utils/sliding-time-window';
import { CircuitBreakerPolicy } from '..';
import { CircuitBreakerState } from '.';

interface InvocationMetadata {
	didFail: boolean;
}

export class ClosedCircuitBreakerState implements CircuitBreakerState {
	constructor(
		circuitBreaker: CircuitBreakerPolicy,
		samplingDurationMs: number,
		failureThreshold: number,
		minimumThroughput: number
	) {
		this._circuitBreaker = circuitBreaker;
		this._failureThreshold = failureThreshold;
		this._minimumThroughput = minimumThroughput;
		this._invocationRecords = new SlidingTimeWindow<InvocationMetadata>(samplingDurationMs);
	}

	private _hasOpenedCircuit: boolean = false;
	private _circuitBreaker: CircuitBreakerPolicy;
	private _failureThreshold: number;
	private _minimumThroughput: number;
	private _invocationRecords: SlidingTimeWindow<InvocationMetadata>;

	enter() {
		this._hasOpenedCircuit = false;
	}

	async executeAsync(
		asyncFunc: (ct?: CancellationToken) => Promise<any>,
		cancellationToken?: CancellationToken
	): Promise<any> {
		try {
			const result = await asyncFunc(cancellationToken);
			this._invocationRecords.addItem({ didFail: false });

			return result;
		} catch (error) {
			if (this._circuitBreaker.shouldHandleError(error)) {
				this._invocationRecords.addItem({ didFail: true });

				const invocationAttempts = this._invocationRecords.itemCount;

				// avoid recalculating the failure rate if the circuit has already been opened
				if (!this._hasOpenedCircuit && invocationAttempts > this._minimumThroughput) {
					const failedCount = this._invocationRecords.items.reduce(
						(countFailed, record) => (record.didFail ? countFailed + 1 : countFailed),
						0
					);

					const failureRate = failedCount / invocationAttempts;
					if (failureRate > this._failureThreshold) {
						this._hasOpenedCircuit = true;
						this._circuitBreaker.openCircuit();
					}
				}
			}

			throw error;
		}
	}
}
