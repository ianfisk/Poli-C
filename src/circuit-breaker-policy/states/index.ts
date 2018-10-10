export { OpenCircuitBreakerState } from './open';
export { ClosedCircuitBreakerState } from './closed';
export { HalfOpenCircuitBreakerState } from './half-open';

export interface CircuitBreakerState {
	enter(): void;
	executeAsync(asyncFunc: () => Promise<any>): Promise<any>;
}
