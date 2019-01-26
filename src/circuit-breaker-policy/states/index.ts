import { AsyncExecutor } from '../../interfaces';
export { OpenCircuitBreakerState } from './open';
export { ClosedCircuitBreakerState } from './closed';
export { HalfOpenCircuitBreakerState } from './half-open';

export interface CircuitBreakerState extends AsyncExecutor {
	enter(): void;
}
