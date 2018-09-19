const expect = require('expect');
const { RetryPolicy, CancellationTokenSource } = require('../dist/index');

function getRandomNonNegativeNumber() {
	return Math.floor(Math.random() * 20) + 1;
}

function asyncDelay(wait = 20) {
	return new Promise(resolve => setTimeout(resolve, wait));
}

function asyncDelayException(wait = 20) {
	return new Promise((resolve, reject) => setTimeout(reject, wait));
}

describe('RetryPolicy', () => {
	describe('waitAndRetry', () => {
		it('handles a sleepDurationProvider that is a number', async () => {
			const retryPolicy = RetryPolicy.waitAndRetry({
				retryCount: getRandomNonNegativeNumber(),
				sleepDurationProvider: getRandomNonNegativeNumber(),
			});
			expect(retryPolicy).toBeInstanceOf(RetryPolicy);
		});

		it('handles a sleepDurationProvider that is a function', async () => {
			const retryPolicy = RetryPolicy.waitAndRetry({
				retryCount: getRandomNonNegativeNumber(),
				sleepDurationProvider: () => getRandomNonNegativeNumber(),
			});
			expect(retryPolicy).toBeInstanceOf(RetryPolicy);
		});

		it('allows an undefined sleepDurationProvider', () => {
			const retryPolicy = RetryPolicy.waitAndRetry({
				retryCount: getRandomNonNegativeNumber(),
			});
			expect(retryPolicy).toBeInstanceOf(RetryPolicy);
		});

		it('throws with a retryCount of zero', async () => {
			expect(() => {
				RetryPolicy.waitAndRetry({
					retryCount: 0,
					sleepDurationProvider: getRandomNonNegativeNumber(),
				});
			}).toThrow();
		});

		it('throws with an undefined retryCount', async () => {
			expect(() => {
				RetryPolicy.waitAndRetry();
			}).toThrow();
		});

		it('throws with a null retryCount', async () => {
			expect(() => {
				RetryPolicy.waitAndRetry({
					retryCount: null,
					sleepDurationProvider: getRandomNonNegativeNumber(),
				});
			}).toThrow();
		});

		it('throws with a negative retryCount', async () => {
			expect(() => {
				RetryPolicy.waitAndRetry({
					retryCount: -getRandomNonNegativeNumber(),
					sleepDurationProvider: getRandomNonNegativeNumber(),
				});
			}).toThrow();
		});
	});

	describe('waitAndRetryForever', () => {
		it('handles a sleepDurationProvider that is a number', async () => {
			const retryPolicy = RetryPolicy.waitAndRetryForever({
				sleepDurationProvider: getRandomNonNegativeNumber(),
			});
			expect(retryPolicy).toBeInstanceOf(RetryPolicy);
		});

		it('handles a sleepDurationProvider that is a function', async () => {
			const retryPolicy = RetryPolicy.waitAndRetryForever({
				sleepDurationProvider: () => getRandomNonNegativeNumber(),
			});
			expect(retryPolicy).toBeInstanceOf(RetryPolicy);
		});
	});

	describe('executeAsync', () => {
		it('retries on exception n times and throws on the last attempt', async () => {
			const retryCount = getRandomNonNegativeNumber();
			const retryPolicy = RetryPolicy.waitAndRetry({
				retryCount,
				sleepDurationProvider: 5,
			});

			let executionAttempts = 0;
			let hasError = false;
			try {
				await retryPolicy.executeAsync(async () => {
					executionAttempts++;
					await asyncDelayException();
				});
			} catch (e) {
				hasError = true;
			}

			expect(hasError).toBe(true);
			expect(executionAttempts).toEqual(retryCount);
		});

		it(`doesn't retry when there is no exception`, async () => {
			const retryPolicy = RetryPolicy.waitAndRetry({
				retryCount: getRandomNonNegativeNumber(),
				sleepDurationProvider: () => getRandomNonNegativeNumber(),
			});

			let executionAttempts = 0;
			await retryPolicy.executeAsync(async () => {
				executionAttempts++;
				await asyncDelay();
			});
			expect(executionAttempts).toBe(1);
		});

		it('stops retrying if successful', async () => {
			const retryCount = Math.max(2, getRandomNonNegativeNumber());
			const numberOfAttemptsToThrow = Math.floor(retryCount / 2);

			const retryPolicy = RetryPolicy.waitAndRetry({ retryCount });

			let throwCount = 0;
			await retryPolicy.executeAsync(async () => {
				if (throwCount < numberOfAttemptsToThrow) {
					throwCount++;
					throw new Error();
				}

				await asyncDelay();
			});

			expect(throwCount).toEqual(numberOfAttemptsToThrow);
		});

		it('stops retrying forever if successful', async () => {
			const retryCount = Math.max(2, getRandomNonNegativeNumber());
			const numberOfAttemptsToThrow = Math.floor(retryCount / 2);

			const retryPolicy = RetryPolicy.waitAndRetryForever({
				sleepDurationProvider: getRandomNonNegativeNumber(),
			});

			let throwCount = 0;
			await retryPolicy.executeAsync(async () => {
				if (throwCount < numberOfAttemptsToThrow) {
					throwCount++;
					throw new Error();
				}

				await asyncDelay();
			});

			expect(throwCount).toEqual(numberOfAttemptsToThrow);
		});

		it('returns the result of the callback', async () => {
			const workResult = 'work';
			const retryPolicy = RetryPolicy.waitAndRetry({
				retryCount: getRandomNonNegativeNumber(),
			});
			const result = await retryPolicy.executeAsync(async () => {
				await asyncDelay();
				return workResult;
			});

			expect(result).toBe(workResult);
		});

		it('supports cancellation when retrying', async () => {
			const retryPolicy = RetryPolicy.waitAndRetry({
				retryCount: 10,
				sleepDurationProvider: 100,
			});

			const delay = 500;
			const cts = new CancellationTokenSource();
			const start = Date.now();

			// always return Promise.reject() so the policy sets a sleep timeout before canceling
			const asyncWork = retryPolicy.executeAsync(() => Promise.reject(), cts.token);

			await asyncDelay(delay / 4);
			cts.cancel();
			await asyncWork;

			const end = Date.now();
			expect(end - start).toBeLessThan(delay);
		});

		it('supports cancellation when retrying forever', async () => {
			const retryPolicy = RetryPolicy.waitAndRetryForever({
				sleepDurationProvider: 100,
			});

			const delay = 500;
			const cts = new CancellationTokenSource();
			const start = Date.now();

			const asyncWork = retryPolicy.executeAsync(() => Promise.reject(), cts.token);

			await asyncDelay(delay / 4);
			cts.cancel();
			await asyncWork;

			const end = Date.now();
			expect(end - start).toBeLessThan(delay);
		});

		it('passes the cancellation token to the work callback', async () => {
			const retryPolicy = RetryPolicy.waitAndRetry({
				retryCount: getRandomNonNegativeNumber(),
			});
			const cts = new CancellationTokenSource();

			let didWork = false;
			await retryPolicy.executeAsync(cancellationToken => {
				didWork = true;
				expect(cancellationToken).toBe(cts.token);
				return Promise.resolve();
			}, cts.token);

			expect(didWork).toBe(true);
		});

		it('does not execute the work if the cancellation token is already canceled', async () => {
			const retryPolicy = RetryPolicy.waitAndRetry({
				retryCount: getRandomNonNegativeNumber(),
			});
			const cts = new CancellationTokenSource();
			cts.cancel();

			let didWork = false;
			const result = await retryPolicy.executeAsync(() => {
				didWork = true;
				return Promise.resolve('work');
			}, cts.token);

			expect(didWork).toBe(false);
			expect(result).toBeUndefined();
		});
	});
});
