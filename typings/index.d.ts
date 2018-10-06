import { PolicyBuilder as Policy } from './policy-builder';
import * as backoffs from './backoff-algorithms';

export default Policy;
export { CancellationTokenSource, CancellationToken } from './cancellation';
export { RetryPolicy } from './retry-policy';
export { Policy, backoffs };
