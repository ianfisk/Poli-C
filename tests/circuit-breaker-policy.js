const expect = require('expect');
const { Policy, CancellationTokenSource } = require('../dist/index');
const { CircuitBreakerPolicy } = require('../dist/circuit-breaker-policy');
const { getRandomPositiveNumber, asyncDelay, asyncDelayException } = require('./utility');

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

		it('creates a CircuitBreakerPolicy that handles specific errors', () => {
			const cb = Policy.handleError(() => true).circuitBreaker({
				samplingDurationMs: 5000,
				failureThreshold: 0.5,
				minimumThroughput: 2,
				breakDurationMs: 5000,
			});
			expect(cb).toBeInstanceOf(CircuitBreakerPolicy);
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

		it('throw if onOpen is not a function', () => {
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
	});

	describe('circuit breaker failure threshold', () => {});

	describe('circuit breaker failure threshold', () => {});
});
