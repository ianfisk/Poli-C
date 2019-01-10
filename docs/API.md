# API Reference

- [Policies](#policies)
	- [PolicyBuilder](#policybuilder)
	- [RetryPolicy](#retrypolicy)
	- [CircuitBreakerPolicy](#circuitbreakerpolicy)

- [Backoff Algorithms](#backoff-algorithms)

- [Cancellation](#cancellation)
	- [CancellationTokenSource](#cancellationtokensource)
	- [CancellationToken](#cancellationtoken)

## Policies

### PolicyBuilder

A class used to construct policies. This is the default export of the library (when using TypeScript), or is accessible via the `Policy` export when using ES6 modules (e.g. `import { Policy } from 'poli-c'; // ES6`). 

**Static Methods for all Policies**

_`handleError`_
```typescript
Policy.handleError(errorPredicate: (error: Error) => boolean): PolicyBuilder;
```

Only handle specific errors by adding an error predicate to the policy. The predicate is called after an error has been caught. Information regarding how errors are handled can be found in the documentation for each policy.


### RetryPolicy

Retry asynchronous actions when an exception is thrown or until a valid result is obtained.


**Construction**

```typescript
Policy.waitAndRetry(options: {
	retryCount: number;
	sleepDurationProvider?: sleepDurationProvider;
}): RetryPolicy;

Policy.waitAndRetryForever(options?: {
	sleepDurationProvider?: sleepDurationProvider;
}): RetryPolicy;
```

Return a new `RetryPolicy` that retries a limited number of times or forever, respectively. There are non-static counterparts to these methods that can be invoked after a `PolicyBuilder` is obtained (e.g. `Policy.handleError(errorPredicate).waitAndRetry(options)`).

Parameters:
- `retryCount`: A number greater than 0. 
- `sleepDurationProvider`: _(Optional)_ A function (e.g. a [backoff algorithm](#backoff-algorithms)) or number used to configure how long the policy waits before retrying. If a function is used, the `sleepDurationProvider` is passed an object with a `retryAttempt` property that can be used when calculating the sleep period.


**Instance Methods**

_`untilValidResult`_
```typescript
untilValidResult(resultValidator: (result: any) => boolean): RetryPolicy;
```
Further configure the policy by controlling when it deems a result valid and quits retrying an action. Each instance of a policy may only have one result validator at a time. If no result validator is added to a policy, by default every result is considered valid. The retry policy this method is invoked on is returned so it is natural to construct a policy via chaining:

```typescript
const retryPolicy = Policy
	.handleError(errorPredicate)
	.waitAndRetry(options)
	.untilValidResult(validator);
...
const validResult = await retryPolicy.executeAsync(asyncFunc);
```

Parameters:
- `resultValidator`: A function invoked in `executeAsync` with the result of the executed action to determine if the result is valid. Returning `true` from this function will cause the policy to return the valid result from `executeAsync`. Returning `false` will cause the policy to sleep and retry the action. `resultValidator` is only invoked when no error is thrown in the action. If `resultValidator` is not a function an error is thrown.

_`executeAsync`_
```typescript
executeAsync(
	asyncFunc: (ct?: CancellationToken) => Promise<any>,
	cancellationToken?: CancellationToken
): Promise<any>;
```
Execute an asynchronous action with this policy. `asyncFunc` is repeatedly invoked
1) when an error is thrown during invocation
1) until a valid result is obtained (can be controlled by adding a validator with `untilValidResult`)
1) or until the cancellation token is canceled.

If the policy is configured to retry a limited number of times, the final time `asyncFunc` is invoked happens outside of a try/catch, so calling code should be prepared to handle an error. Inbetween invocations, `executeAsync` sleeps for a period of time that can be controlled by passing a `sleepDurationProvider` in the options used to construct the policy.

`executeAsync` returns a promise that resolves to the result of `asyncFunc` or `undefined` if the cancellation token is canceled.

Parameters:
- `asyncFunc`: The asynchronous function to execute. It may optionally accept a `CancellationToken` (see [Cancellation](#cancellation) for more information about how to construct a token) that can be used to observe cancellation requests.
- `cancellationToken`: _(Optional)_ parameter. If provided, the policy will observe cancellation requests and return `undefined`.


**Errors in `executeAsync`**

An error predicate added to a `RetryPolicy` during construction is used by the policy to determine whether or not an error should be handled and the action retried. If the error predicate returns `false`, the error is rethrown. If the error predicate returns `true`, the policy sleeps and retries the action. By default, a retry policy handles all errors.


### CircuitBreakerPolicy

Detect failures and protect downstream systems by temporarily preventing clients from executing actions that are likely to fail.


**Construction**

```typescript
Policy.circuitBreaker(options: {
	samplingDurationMs: number;
	failureThreshold: number;
	minimumThroughput: number;
	breakDurationMs: number;
	onOpen?: () => void;
	onClose?: () => void;
}): CircuitBreakerPolicy;
```

Return a new `CircuitBreakerPolicy`. There is a non-static counterpart to this method that can be invoked after a `PolicyBuilder` is obtained (e.g. `Policy.handleError(errorPredicate).circuitBreaker(options)`).

Parameters:
- `samplingDurationMs`: The sliding time window in which successes/failures are considered. Invocations older than the period are discarded. This must be a number greater than 20 milliseconds.
- `failureThreshold`: The threshold of failures at which the circuit should break. When the failure rate is determined to be greater than or equal to the failure threshold, the circuit is opened. This must be a number in the range (0, 1).
- `minimumThroughput`: The minimum number of invocations that must be made in the sampling period before the failure threshold is examined. This must be a number greater than or equal to two.
- `breakDurationMs`: The time the circuit should remain in the open state before transitioning to the half-open state. See the documentation for a [`CircuitBreakerPolicy`](#circuitbreakerpolicy) to learn more about these states. This must be a number greater than 20 milliseconds.
- `onOpen`: _(Optional)_ A callback that is invoked when the circuit is opened.
- `onClose`: _(Optional)_ A callback that is invoked when the circuit is closed.


**Instance Methods**

_`executeAsync`_
```typescript
executeAsync(
	asyncFunc: (ct?: CancellationToken) => Promise<any>,
	cancellationToken?: CancellationToken
): Promise<any>;
```
Execute an asynchronous action with this policy. If the cancellation token is canceled, a promise that resolves to `undefined` is returned. 

Parameters:
- `asyncFunc`: The asynchronous function to execute. It may optionally accept a `CancellationToken` (see [Cancellation](#cancellation) for more information about how to construct a token) that can be used to observe cancellation requests.
- `cancellationToken`: _(Optional)_ If provided, the policy will observe cancellation requests and return `undefined`.


**Errors in `executeAsync`**

If an error is thrown when invoking `asyncFunc` that the policy handles (controlled by adding an error predicate using `Policy.handleError`), the circuit breaker may need to change its state:
1) If the circuit is in the closed state, the circuit will be opened if the number of invocation attempts during the sampling period is greater than or equal to the policy's minimum throughput and the failure rate is greater than or equal to the policy's failure threshold. The circuit will stay open for the configured break duration until moving into the half-open state.
1) If the circuit is in the half-open state, any error thrown will transition the circuit back into the open state. If `asyncFunc` is invoked successfully, the circuit will transition to the closed state.

Note that any errors caught in a circuit breaker policy are rethrown after the circuit breaker has updated its internal state.


## Backoff Algorithms

`poli-c` implements the full and equal jitter strategies described here: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/. Each strategy accepts an object with the shape `{ retryAttempt: number; maxDelayMs?: number; seedDelayMs?: number }` and returns the number of milliseconds to sleep. `maxDelayMs` defaults to 10000 and `seedDelayMs` defaults to 1000. Backoff algorithms are exposed via the `backoffs` export. Example:

```js
import { Policy, backoffs } from 'poli-c';

const policy = Policy.waitAndRetry({ retryCount: 3, sleepDurationProvider: backoffs.fullJitter });
// or 
const policy = Policy.waitAndRetry({ retryCount: 3, sleepDurationProvider: ({ retryAttempt }) => backoffs.fullJitter({ retryAttempt, maxDelayMs: 5000, seedDelayMs: 500 }) });

...
const things = await policy.executeAsync(fetchThings);
```

Additionally, a custom backoff algorithm can be used in retry policies by providing a function that accepts an object with a `retryAttempt` property and returns a number:

```js
const policy = Policy.waitAndRetry({ retryCount: 3, sleepDurationProvider: ({ retryAttempt }) => 1000 * retryAttempt });
```

## Cancellation

`poli-c` supports [cooperative cancellation](https://docs.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads) by providing cancellation abstractions originally found in the .NET Framework. The `CancellationTokenSource` class can be imported from `poli-c` and used to construct a `CancellationToken` that can be passed to a policy's `executeAsync` method so the policy can observe cancellation requests. Example:

```js
import { Policy, CancellationTokenSource } from 'poli-c';

const policy = Policy.waitAndRetryForever();

...

const cts = new CancellationTokenSource();
const promise = policy.executeAsync(fetchThings, cts.token);

// eventually cancel the execution
const timeout = setTimeout(() => {
	cts.cancel();
}, maxRequestTime);

const things = await promise;
if (!things) {
	// canceled
} else {
	// not canceled
	clearTimeout(timeout);
}
...
```

### CancellationTokenSource

**Construction**

```typescript
constructor(millisecondsDelay?: number);
```

Parameters:
- `millisecondsDelay`: _(Optional)_ The amount of time until the token source should be canceled.

**Static Methods**

_`createLinkedTokenSource`_
```typescript
static createLinkedTokenSource(...tokens: CancellationToken[]): CancellationTokenSource;
```

Create a token source that will be canceled when any of the supplied tokens are canceled. If any tokens are already canceled when this method is called, the resulting token source will also be canceled.

**Instance Properties**

_`token`_
```typescript
readonly token: CancellationToken;
```
The `CancellationTokenSource`'s token that can be used to observe cancellation. After disposal, attempting to access this property will cause an error to be thrown.

_`isCancellationRequested`_
```typescript
readonly isCancellationRequested: boolean;
```
Whether or not the token source is in the canceled state.

**Instance Methods**

_`cancel`_
```typescript
cancel(): void;
```
Cancel the token source. Cancelling the token source causes the source's token to move into the canceled state. Accessing this method after the source has been disposed will cause an error to be thrown.

_`dispose`_
```typescript
dispose(): void;
```
Dispose the token source. Disposal severs the relationship between the source and its token and leaves the source in an unusable state. If the token was not previously canceled, it will never be able to reach that state.

### CancellationToken

**Instance Properties**

_`isCancellationRequested`_
```typescript
readonly isCancellationRequested: boolean;
```
Whether or not the token is in the canceled state.

**Instance Methods**

_`throwIfCancellationRequested`_
```typescript
throwIfCancellationRequested: () => void;
```
Throw an error if the token is canceled. 

```typescript
register(callback: () => void): () => void;
```
Register a callback that will be executed when the token transitions to the canceled state. If the token is already canceled at the time of registration, the callback is invoked immediately.

A function to unsubscribe the callback is returned.
