const expect = require('expect');
const { Policy, CancellationTokenSource } = require('../dist/index');
const { CircuitBreakerPolicy } = require('../dist/circuit-breaker-policy');
const {
	OpenCircuitBreakerState,
	ClosedCircuitBreakerState,
	HalfOpenCircuitBreakerState,
} = require('../dist/circuit-breaker-policy/states');
const { asyncDelay } = require('./utility');

describe('CircuitBreakerPolicy', () => {
	describe('circuit breaker creation', () => {
		it('creates a CircuitBreakerPolicy', () => {
			const cb = Policy.circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.5,
				minimumThroughput: 2,
				breakDurationMs: 5000,
			});
			expect(cb).toBeInstanceOf(CircuitBreakerPolicy);
		});

		it('throws if no options are specified', () => {
			expect(() => Policy.circuitBreaker()).toThrow();
		});

		it('creates a CircuitBreakerPolicy that handles specific errors', () => {
			const cb = Policy.handleError(() => true).circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.5,
				minimumThroughput: 2,
				breakDurationMs: 5000,
			});
			expect(cb).toBeInstanceOf(CircuitBreakerPolicy);
		});

		it('throws if failure threshold is not defined', () => {
			expect(() =>
				Policy.circuitBreaker({
					samplingDurationMs: 5000,
					failureThreshold: undefined,
					minimumThroughput: 2,
					breakDurationMs: 5000,
				})
			).toThrow();
		});

		it('throws if failure threshold is zero', () => {
			expect(() =>
				Policy.circuitBreaker({
					samplingDurationMs: 5000,
					failureThreshold: 0,
					minimumThroughput: 2,
					breakDurationMs: 5000,
				})
			).toThrow();
		});

		it('throws if failure threshold is less than zero', () => {
			expect(() =>
				Policy.circuitBreaker({
					samplingDurationMs: 5000,
					failureThreshold: -1,
					minimumThroughput: 2,
					breakDurationMs: 5000,
				})
			).toThrow();
		});

		it('throws if failure threshold is one', () => {
			expect(() =>
				Policy.circuitBreaker({
					samplingDurationMs: 5000,
					failureThreshold: 1,
					minimumThroughput: 2,
					breakDurationMs: 5000,
				})
			).toThrow();
		});

		it('throws if failure threshold is greater than one', () => {
			expect(() =>
				Policy.circuitBreaker({
					samplingDurationMs: 5000,
					failureThreshold: 1.1,
					minimumThroughput: 2,
					breakDurationMs: 5000,
				})
			).toThrow();
		});

		it('throws if sampling duration is not defined', () => {
			expect(() =>
				Policy.circuitBreaker({
					samplingDurationMs: undefined,
					failureThreshold: 0.5,
					minimumThroughput: 2,
					breakDurationMs: 5000,
				})
			).toThrow();
		});

		it('throws if sampling duration is less than 20 milliseconds', () => {
			expect(() =>
				Policy.circuitBreaker({
					samplingDurationMs: 19,
					failureThreshold: 0.5,
					minimumThroughput: 2,
					breakDurationMs: 5000,
				})
			).toThrow();
		});

		it('throws if minimum throughput is not defined', () => {
			expect(() =>
				Policy.circuitBreaker({
					samplingDurationMs: 5000,
					failureThreshold: 0.5,
					minimumThroughput: undefined,
					breakDurationMs: 5000,
				})
			).toThrow();
		});

		it('throws if minimum throughput is less than 2', () => {
			expect(() =>
				Policy.circuitBreaker({
					samplingDurationMs: 5000,
					failureThreshold: 0.5,
					minimumThroughput: 1,
					breakDurationMs: 5000,
				})
			).toThrow();
		});

		it('throws if break duration is not defined', () => {
			expect(() =>
				Policy.circuitBreaker({
					samplingDurationMs: 5000,
					failureThreshold: 0.5,
					minimumThroughput: 2,
					breakDurationMs: undefined,
				})
			).toThrow();
		});

		it('throws if break duration is less than 20 milliseconds', () => {
			expect(() =>
				Policy.circuitBreaker({
					samplingDurationMs: 5000,
					failureThreshold: 0.5,
					minimumThroughput: 2,
					breakDurationMs: 19,
				})
			).toThrow();
		});

		it('throws if onOpen is not a function', () => {
			const onOpenValues = [1, true, 'string', {}, []];
			for (const onOpen of onOpenValues) {
				expect(() =>
					Policy.circuitBreaker({
						samplingDurationMs: 5000,
						failureThreshold: 0.5,
						minimumThroughput: 2,
						breakDurationMs: 20,
						onOpen,
					})
				).toThrow();
			}
		});

		it('throws if onClose is not a function', () => {
			const onCloseValues = [1, true, 'string', {}, []];
			for (const onClose of onCloseValues) {
				expect(() =>
					Policy.circuitBreaker({
						samplingDurationMs: 5000,
						failureThreshold: 0.5,
						minimumThroughput: 2,
						breakDurationMs: 20,
						onClose,
					})
				).toThrow();
			}
		});
	});

	describe('closed state', () => {
		it('does not open when the failure threshold is not met', async () => {
			const cb = Policy.circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.75,
				minimumThroughput: 4,
				breakDurationMs: 5000,
			});

			await executeSuccess(cb);
			await executeSuccess(cb);
			await executeFailure(cb);
			await executeFailure(cb);

			expect(cb._currentState).toBeInstanceOf(ClosedCircuitBreakerState);
		});

		it('opens when the failure threshold is met', async () => {
			const cb = Policy.circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.75,
				minimumThroughput: 4,
				breakDurationMs: 5000,
			});

			await executeSuccess(cb);
			await executeFailure(cb);
			await executeFailure(cb);
			await executeFailure(cb);

			expect(cb._currentState).toBeInstanceOf(OpenCircuitBreakerState);
		});

		it('opens when the failure threshold is exceeded', async () => {
			const cb = Policy.circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.75,
				minimumThroughput: 4,
				breakDurationMs: 5000,
			});

			await executeFailure(cb);
			await executeFailure(cb);
			await executeFailure(cb);
			await executeFailure(cb);

			expect(cb._currentState).toBeInstanceOf(OpenCircuitBreakerState);
		});

		it('does not open when the minimum throughput is not met', async () => {
			const cb = Policy.circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.75,
				minimumThroughput: 4,
				breakDurationMs: 5000,
			});

			await executeFailure(cb);
			await executeFailure(cb);
			await executeFailure(cb);

			expect(cb._currentState).toBeInstanceOf(ClosedCircuitBreakerState);
		});

		it('opens when the minimum throughput is met', async () => {
			const cb = Policy.circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.75,
				minimumThroughput: 4,
				breakDurationMs: 5000,
			});

			await executeFailure(cb);
			await executeFailure(cb);
			await executeFailure(cb);
			await executeFailure(cb);

			expect(cb._currentState).toBeInstanceOf(OpenCircuitBreakerState);
		});

		it('opens when the minimum throughput is exceeded', async () => {
			const cb = Policy.circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.75,
				minimumThroughput: 4,
				breakDurationMs: 5000,
			});

			await executeSuccess(cb);
			await executeFailure(cb);
			await executeFailure(cb);
			await executeFailure(cb);
			await executeFailure(cb);
			await executeFailure(cb);

			expect(cb._currentState).toBeInstanceOf(OpenCircuitBreakerState);
		});

		it('only opens if the error is handled by the circuit breaker', async () => {
			const cb = Policy.handleError(shouldHandle => shouldHandle).circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.75,
				minimumThroughput: 4,
				breakDurationMs: 5000,
			});

			await executeSuccess(cb);
			await executeFailure(cb, false); // not handled by the policy
			await executeFailure(cb, true);
			await executeFailure(cb, true);

			expect(cb._currentState).toBeInstanceOf(ClosedCircuitBreakerState);

			await executeFailure(cb, true);

			expect(cb._currentState).toBeInstanceOf(OpenCircuitBreakerState);
		});

		it('calls onClose when closed', async () => {
			const breakDurationMs = 100;
			let wasCalled = false;
			const cb = Policy.circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.5,
				minimumThroughput: 2,
				breakDurationMs,
				onClose: () => {
					wasCalled = true;
				},
			});

			await executeSuccess(cb);
			await executeFailure(cb);

			expect(cb._currentState).toBeInstanceOf(OpenCircuitBreakerState);

			await asyncDelay(breakDurationMs + 5);

			expect(cb._currentState).toBeInstanceOf(HalfOpenCircuitBreakerState);
			await executeSuccess(cb);
			expect(cb._currentState).toBeInstanceOf(ClosedCircuitBreakerState);
			expect(wasCalled).toBe(true);
		});

		it('does not open when the failure threshold is not exceeded in the sampling time window', async () => {
			const samplingDurationMs = 20;
			const cb = Policy.circuitBreaker({
				samplingDurationMs,
				failureThreshold: 0.75,
				minimumThroughput: 4,
				breakDurationMs: 5000,
			});

			await executeFailure(cb);
			await executeFailure(cb);
			await executeFailure(cb);

			await asyncDelay(samplingDurationMs);

			// since the old execution attempts are now outside the current time window they should
			// not be counted when calculating the failure rate so the threshold shouldn't be met
			await executeFailure(cb);
			await executeFailure(cb);
			await executeFailure(cb);

			expect(cb._currentState).toBeInstanceOf(ClosedCircuitBreakerState);
		});

		it('opens when the failure threshold is exceeded in the sampling time window', async () => {
			const samplingDurationMs = 20;
			const cb = Policy.circuitBreaker({
				samplingDurationMs,
				failureThreshold: 0.75,
				minimumThroughput: 4,
				breakDurationMs: 5000,
			});

			await executeFailure(cb);
			await executeFailure(cb);
			await executeFailure(cb);

			await asyncDelay(samplingDurationMs / 2);

			// since the old execution attempts are still in the current time window they should
			// be counted when calculating the failure rate so the threshold should be met
			await executeFailure(cb);

			expect(cb._currentState).toBeInstanceOf(OpenCircuitBreakerState);
		});
	});

	describe('open state', () => {
		it('calls onOpen when opened', async () => {
			let wasOpened = false;
			const cb = Policy.circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.5,
				minimumThroughput: 2,
				breakDurationMs: 5000,
				onOpen: () => {
					wasOpened = true;
				},
			});

			await executeSuccess(cb);
			await executeFailure(cb);

			expect(cb._currentState).toBeInstanceOf(OpenCircuitBreakerState);
			expect(wasOpened).toBe(true);
		});

		it('throws without invoking the async function', async () => {
			const cb = Policy.circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.5,
				minimumThroughput: 2,
				breakDurationMs: 5000,
			});

			await executeSuccess(cb);
			await executeFailure(cb);

			expect(cb._currentState).toBeInstanceOf(OpenCircuitBreakerState);

			let wasCalled = false;
			let didThrow = false;
			try {
				await cb.executeAsync(() => {
					wasCalled = true;
					return Promise.resolve();
				});
			} catch (e) {
				didThrow = true;
			}

			expect(wasCalled).toBe(false);
			expect(didThrow).toBe(true);
		});

		it('lasts for breakDurationMs', async () => {
			const breakDurationMs = 100;
			const cb = Policy.circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.5,
				minimumThroughput: 2,
				breakDurationMs,
			});

			await executeSuccess(cb);
			await executeFailure(cb);

			expect(cb._currentState).toBeInstanceOf(OpenCircuitBreakerState);

			await asyncDelay(breakDurationMs + 5);

			expect(cb._currentState).toBeInstanceOf(HalfOpenCircuitBreakerState);
		});
	});

	describe('half-open state', () => {
		it('closes the circuit breaker if the first call succeeds', async () => {
			const breakDurationMs = 100;
			const cb = Policy.circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.5,
				minimumThroughput: 2,
				breakDurationMs,
			});

			await executeSuccess(cb);
			await executeFailure(cb);

			expect(cb._currentState).toBeInstanceOf(OpenCircuitBreakerState);

			await asyncDelay(breakDurationMs + 5);

			expect(cb._currentState).toBeInstanceOf(HalfOpenCircuitBreakerState);
			await executeSuccess(cb);
			expect(cb._currentState).toBeInstanceOf(ClosedCircuitBreakerState);
		});

		it('opens the circuit breaker if the first call fails', async () => {
			const breakDurationMs = 100;
			const cb = Policy.circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.5,
				minimumThroughput: 2,
				breakDurationMs,
			});

			await executeSuccess(cb);
			await executeFailure(cb);

			expect(cb._currentState).toBeInstanceOf(OpenCircuitBreakerState);

			await asyncDelay(breakDurationMs + 5);

			expect(cb._currentState).toBeInstanceOf(HalfOpenCircuitBreakerState);
			await executeFailure(cb);
			expect(cb._currentState).toBeInstanceOf(OpenCircuitBreakerState);
		});

		it('ignores errors the circuit breaker does not handle', async () => {
			const breakDurationMs = 100;
			const cb = Policy.handleError(shouldHandle => shouldHandle).circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.5,
				minimumThroughput: 2,
				breakDurationMs,
			});

			await executeSuccess(cb);
			await executeFailure(cb, true);

			expect(cb._currentState).toBeInstanceOf(OpenCircuitBreakerState);
			await asyncDelay(breakDurationMs + 5);
			expect(cb._currentState).toBeInstanceOf(HalfOpenCircuitBreakerState);

			// this error is not handled and thus doesn't cause a transition
			await executeFailure(cb, false);
			expect(cb._currentState).toBeInstanceOf(HalfOpenCircuitBreakerState);

			// this error should be handled
			await executeFailure(cb, true);
			expect(cb._currentState).toBeInstanceOf(OpenCircuitBreakerState);

			// and eventually the circuit breaker should close
			await asyncDelay(breakDurationMs + 5);
			expect(cb._currentState).toBeInstanceOf(HalfOpenCircuitBreakerState);
			await executeSuccess(cb);
			expect(cb._currentState).toBeInstanceOf(ClosedCircuitBreakerState);
		});
	});

	describe('executeAsync', () => {
		it('throws an error when the argument is not a function', async () => {
			const cb = Policy.circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.5,
				minimumThroughput: 2,
				breakDurationMs: 5000,
			});

			const inputs = [2, '', true, Promise.resolve()];
			for (const input of inputs) {
				let didThrow = false;
				try {
					await cb.executeAsync(input);
				} catch (e) {
					didThrow = true;
				}

				expect(didThrow).toBe(true);
			}
		});

		it('does not execute when the cancellation token is canceled', async () => {
			const cb = Policy.circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.5,
				minimumThroughput: 2,
				breakDurationMs: 5000,
			});
			const cts = new CancellationTokenSource();
			cts.cancel();

			let wasCalled = false;
			await cb.executeAsync(() => {
				wasCalled = true;
				return Promise.resolve();
			}, cts.token);

			expect(wasCalled).toBe(false);
		});

		it('returns the result of the callback', async () => {
			const workResult = 'work';
			const cb = Policy.circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.5,
				minimumThroughput: 2,
				breakDurationMs: 5000,
			});
			const result = await cb.executeAsync(async () => {
				await asyncDelay();
				return workResult;
			});

			expect(result).toBe(workResult);
		});

		it('passes the cancellation token to the work callback', async () => {
			const cb = Policy.circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.5,
				minimumThroughput: 2,
				breakDurationMs: 5000,
			});
			const cts = new CancellationTokenSource();

			let didWork = false;
			await cb.executeAsync(cancellationToken => {
				didWork = true;
				expect(cancellationToken).toBe(cts.token);
				return Promise.resolve();
			}, cts.token);

			expect(didWork).toBe(true);
		});
	});
});

function executeSuccess(policy) {
	return policy.executeAsync(() => Promise.resolve());
}

async function executeFailure(policy, error) {
	try {
		await policy.executeAsync(() => Promise.reject(error));
	} catch (e) {
		// no-op
	}
}
