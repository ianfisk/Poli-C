const expect = require('expect');
const { Policy } = require('../dist/index');

describe('Policy', () => {
	describe('handleError', () => {
		it('throws for an error predicate that is not a function', () => {
			expect(() => Policy.handleError(1)).toThrow();
			expect(() => Policy.handleError(true)).toThrow();
			expect(() => Policy.handleError('string')).toThrow();
			expect(() => Policy.handleError(undefined)).toThrow();
			expect(() => Policy.handleError(null)).toThrow();
			expect(() => Policy.handleError({})).toThrow();
			expect(() => Policy.handleError([])).toThrow();
		});
	});
});
