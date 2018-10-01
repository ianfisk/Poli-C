const expect = require('expect');
const { CancellationTokenSource } = require('../dist/index');
const { getRandomPositiveNumber, getRandomNonNegativeNumber, asyncDelay } = require('./utility');

describe('CancellationTokenSource', () => {
	it('creates a source in the default state', () => {
		const cts = new CancellationTokenSource();
		expect(cts.isCancellationRequested).toBe(false);
		expect(cts.token.isCancellationRequested).toBe(false);
	});

	it('can be canceled synchronously', () => {
		const cts = new CancellationTokenSource();
		expect(cts.isCancellationRequested).toBe(false);
		expect(cts.token.isCancellationRequested).toBe(false);

		cts.cancel();

		expect(cts.isCancellationRequested).toBe(true);
		expect(cts.token.isCancellationRequested).toBe(true);
	});

	it('executes registrations synchronously when canceled', () => {
		const cts = new CancellationTokenSource();
		let wasCanceled = false;
		cts.token.register(() => {
			wasCanceled = true;
		});
		cts.cancel();

		expect(cts.isCancellationRequested).toBe(true);
		expect(cts.token.isCancellationRequested).toBe(true);
		expect(wasCanceled).toBe(true);
	});

	it('executes attempted registrations synchronously when already canceled', () => {
		const cts = new CancellationTokenSource();
		cts.cancel();
		let wasCanceled = false;
		cts.token.register(() => {
			wasCanceled = true;
		});

		expect(cts.isCancellationRequested).toBe(true);
		expect(cts.token.isCancellationRequested).toBe(true);
		expect(wasCanceled).toBe(true);
	});

	it('can be canceled more than once', () => {
		const cts = new CancellationTokenSource();
		expect(cts.isCancellationRequested).toBe(false);
		expect(cts.token.isCancellationRequested).toBe(false);

		cts.cancel();
		cts.cancel();

		expect(cts.isCancellationRequested).toBe(true);
		expect(cts.token.isCancellationRequested).toBe(true);
	});

	it('does not execute registrations more than once when canceled multiple times', () => {
		const cts = new CancellationTokenSource();
		let count = 0;
		cts.token.register(() => {
			count++;
		});
		cts.cancel();
		cts.cancel();

		expect(cts.isCancellationRequested).toBe(true);
		expect(cts.token.isCancellationRequested).toBe(true);
		expect(count).toBe(1);
	});

	it('supports unregistering callbacks', () => {
		const cts = new CancellationTokenSource();
		let wasCalled = false;
		const unregister = cts.token.register(() => {
			wasCalled = true;
		});

		unregister();
		cts.cancel();

		expect(cts.isCancellationRequested).toBe(true);
		expect(cts.token.isCancellationRequested).toBe(true);
		expect(wasCalled).toBe(false);
	});

	it('executes multiple registrations when canceled', () => {
		const cts = new CancellationTokenSource();
		const registerCount = getRandomPositiveNumber();
		const unregisterCallbacks = [];
		let count = 0;
		for (let i = 0; i < registerCount; i++) {
			unregisterCallbacks.push(
				cts.token.register(() => {
					count++;
				})
			);
		}

		cts.cancel();
		expect(count).toBe(registerCount);
	});

	it('executes remaining registrations when canceled', () => {
		const cts = new CancellationTokenSource();
		let executedCallbackCount = 0;
		const registerCount = getRandomPositiveNumber();
		const unregisterCallbacks = [];

		for (let i = 0; i < registerCount; i++) {
			unregisterCallbacks.push(
				cts.token.register(() => {
					executedCallbackCount++;
				})
			);
		}

		unregisterCallbacks[getRandomNonNegativeNumber(registerCount)]();

		cts.cancel();
		expect(executedCallbackCount).toBe(registerCount - 1);
	});

	it('propagates errors thrown in registrations', () => {
		const cts = new CancellationTokenSource();
		cts.token.register(() => {
			throw new Error();
		});

		let wasCalled = false;
		cts.token.register(() => {
			wasCalled = true;
		});

		expect(() => cts.cancel()).toThrow();
		expect(wasCalled).toBe(false);
	});

	it('can be disposed of', () => {
		const cts = new CancellationTokenSource();
		cts.dispose();
	});

	it('throws an exception if accessing the token after disposal', () => {
		const cts = new CancellationTokenSource();
		cts.dispose();
		expect(() => cts.token).toThrow();
		expect(cts.isCancellationRequested).toBe(false);
	});

	it('throws an exception if canceled after disposal', () => {
		const cts = new CancellationTokenSource();
		cts.dispose();
		expect(() => cts.cancel()).toThrow();
		expect(cts.isCancellationRequested).toBe(false);
	});

	it('does not call registrations when disposed but not canceled', () => {
		const cts = new CancellationTokenSource();
		let wasCalled = false;
		cts.token.register(() => {
			wasCalled = true;
		});
		cts.dispose();

		expect(cts.isCancellationRequested).toBe(false);
		expect(wasCalled).toBe(false);
	});

	it('can be constructed with a delay', async () => {
		const cancelDelay = getRandomNonNegativeNumber();
		const cts = new CancellationTokenSource(cancelDelay);

		await asyncDelay(cancelDelay + 1);

		expect(cts.isCancellationRequested).toBe(true);
		expect(cts.token.isCancellationRequested).toBe(true);
	});

	describe('createLinkedTokenSource', () => {
		it('returns a source that is canceled when one of the linked tokens is canceled', () => {
			const sources = createTokenSources();
			const cts = CancellationTokenSource.createLinkedTokenSource(...sources.map(x => x.token));

			expect(cts.isCancellationRequested).toBe(false);
			expect(cts.token.isCancellationRequested).toBe(false);

			sources[getRandomNonNegativeNumber(sources.length)].cancel();

			expect(cts.isCancellationRequested).toBe(true);
			expect(cts.token.isCancellationRequested).toBe(true);
		});

		it('returns a canceled source if any linked token is already canceled', () => {
			const sources = createTokenSources();
			sources[getRandomNonNegativeNumber(sources.length)].cancel();

			const cts = CancellationTokenSource.createLinkedTokenSource(...sources.map(x => x.token));
			expect(cts.isCancellationRequested).toBe(true);
			expect(cts.token.isCancellationRequested).toBe(true);
		});

		it('executes registration when a linked token is canceled', () => {
			const sources = createTokenSources();
			const cts = CancellationTokenSource.createLinkedTokenSource(...sources.map(x => x.token));

			let wasCalled = false;
			cts.token.register(() => {
				wasCalled = true;
			});

			sources[getRandomNonNegativeNumber(sources.length)].cancel();
			expect(wasCalled).toBe(true);
		});

		it('executes all registrations when a linked token is canceled', () => {
			const sources = createTokenSources();
			const cts = CancellationTokenSource.createLinkedTokenSource(...sources.map(x => x.token));

			const registerCount = getRandomPositiveNumber();
			const unregisterCallbacks = [];
			let count = 0;
			for (let i = 0; i < registerCount; i++) {
				unregisterCallbacks.push(
					cts.token.register(() => {
						count++;
					})
				);
			}

			sources[getRandomNonNegativeNumber(sources.length)].cancel();
			expect(count).toBe(registerCount);
		});

		it('executes registrations only once when multiple linked tokens are canceled', () => {
			const sources = createTokenSources();
			const cts = CancellationTokenSource.createLinkedTokenSource(...sources.map(x => x.token));

			let count = 0;
			cts.token.register(() => {
				count++;
			});

			const randomSourceIndex = getRandomNonNegativeNumber(sources.length);
			sources[randomSourceIndex].cancel();
			sources[(randomSourceIndex + 1) % sources.length].cancel();
			expect(count).toBe(1);
		});
	});
});

function createTokenSources() {
	let sources = [];
	for (let i = 0; i < getRandomPositiveNumber(); i++) {
		sources.push(new CancellationTokenSource());
	}

	return sources;
}
