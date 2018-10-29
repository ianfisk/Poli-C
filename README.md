# Poli-C

 [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/ianfisk/poli-c/blob/master/LICENSE) [![npm version](https://img.shields.io/npm/v/poli-c.svg)](https://www.npmjs.com/package/poli-c)

Poli-C (pronounced "policy") is a fault tolerance utility for JavaScript. Inspired by [Polly for .NET](https://github.com/App-vNext/Polly), this library's aim is to help applications handle transient failures in asynchronous actions.

## Supported Policies

 - `RetryPolicy` - Sometimes you just need to try again.
 - `CircuitBreakerPolicy` - Don't kick services while they are down.

## Installation

Using yarn:

```
yarn add poli-c
```

Or npm:

```
npm install --save poli-c
```

Then if using TypeScript or a module bundler such as [webpack](https://webpack.js.org/):
```js
import Policy from 'poli-c'; // TypeScript
import { Policy } from 'poli-c'; // ES6

// or if not using ES6 modules
const { Policy } = require('poli-c');
```

## RetryPolicy Examples

### Basic

Retry forever

```js
import { Policy } from 'poli-c';

...

const policy = Policy.waitAndRetryForever({ sleepDurationProvider: 1000 });

async function fetchThings() {
	const response = await fetch('https://servicethatmightfail.com/v1/things');
	const things = await response.json();
	return things;
}

...
const things = await policy.executeAsync(fetchThings);
...
```

Or not

```js
const policy = Policy.waitAndRetry({ retryCount: 3, sleepDurationProvider: 1000 });

...
const things = await policy.executeAsync(fetchThings)
...
```

Additionally, control when the policy retries on error

```js
const policy = Policy
	.handleError(error => error instanceof FetchError)
	.waitAndRetryForever({ sleepDurationProvider: 1000 });

async function fetchThings() {
	const response = await fetch('https://servicethatmightfail.com/v1/things');
	if (response.status !== 404 && !response.ok) {
		// if the request fails the policy will execute the action again
		throw new FetchError(response);
	}

	// but if parsing the JSON fails the action won't be retried
	const things = await response.json();
	return things;
}

...
const things = await policy.executeAsync(fetchThings);
```

### With cancellation

The asynchronous function will be passed a cancellation token if one is provided to `executeAsync`. This allows for a cooperative cancellation approach (borrowed from the .NET framework). If canceled, `executeAsync` will currently return `undefined`.

```js
import { Policy, CancellationTokenSource } from 'poli-c';

...

const policy = Policy.waitAndRetryForever({ sleepDurationProvider: 1000 });

async function fetchThings(cancellationToken) {
	const response = await cancelableFetch('https://servicethatmightfail.com/v1/things', cancellationToken);
	const things = await response.json();
	return things;
}

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

### Until a valid result is obtained

```js
import { Policy } from 'poli-c';

...

const policy = Policy
	.waitAndRetryForever({ sleepDurationProvider: 1000 })
	.untilValidResult(job => job.isComplete);

async function getJob(jobId) {
	const response = await fetch(`https://jobService.com/v1/jobs/${jobId}`);
	const job = await response.json();
	return job;
}

async function waitForJobCompletion(newJob, cancellationToken) {
	const completedJob = await policy.executeAsync(() => getJob(newJob.id), cancellationToken);
}
```

### With exponential backoff

The library includes two backoff algorithms (full and equal jitter as described [here](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)) that are available for use. 

```js
import { Policy, backoffs } from 'poli-c';

...

const policy = Policy.waitAndRetry({ retryCount: 3, sleepDurationProvider: backoffs.fullJitter });

async function fetchThings() {
	const response = await fetch('https://servicethatmightfail.com/v1/things');
	const things = await response.json();
	return things;
}

...
const things = await policy.executeAsync(fetchThings);
...
```

Additionally, a custom backoff algorithm can be used:

```js
const policy = Policy.waitAndRetry({ retryCount: 3, sleepDurationProvider: ({ retryAttempt }) => 1000 * retryAttempt });
```

## CircuitBreakerPolicy Examples

### Basic

```js
import { Policy } from 'poli-c'; // ES6

const policy = Policy
	.handleError(error => error instanceof FetchError)
	.circuitBreaker({
		samplingDurationMs: 5000,
		failureThreshold: 0.75,
		minimumThroughput: 4,
		breakDurationMs: 5000,
	});

async function fetchThings() {
	const response = await fetch('https://servicethatmightfail.com/v1/things');
	if (response.status !== 404 && !response.ok) {
		throw new FetchError(response);
	}

	const things = await response.json();
	return things;
}

...

try {
	const things = await policy.executeAsync(fetchThings);
	return things;
} catch (e) {
	// this error may have been thrown immediately by circuit breaker if the
	// failure threshold has been met in the sampling period
	handleError(e);
}
```
