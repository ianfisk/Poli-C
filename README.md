# RetryPolly

A fault tolerance utility for JavaScript. Inspired by [Polly for .NET](https://github.com/App-vNext/Polly), this library's aim is to help applications handle transient failures in asynchronous actions.

## Examples

### Basic

Retry forever

```js
const policy = RetryPolicy.waitAndRetryForever({ sleepDurationProvider: 1000 });

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
const policy = RetryPolicy.waitAndRetry({ retryCount: 3, sleepDurationProvider: 1000 });

...
const things = await policy.executeAsync(fetchThings)
...
```

### With cancellation

The asynchronous function will be passed a cancellation token if one is provided to `executeAsync`. This allows for a cooperative cancellation approach (borrowed from the .NET framework). If canceled, `executeAsync` will currently return `undefined`.

```js
const policy = RetryPolicy.waitAndRetryForever({ sleepDurationProvider: 1000 });

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
const policy = RetryPolicy
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
const policy = RetryPolicy.waitAndRetry({ retryCount: 3, sleepDurationProvider: backoffs.fullJitter });

async function fetchThings() {
	const response = await fetch('https://servicethatmightfail.com/things');
	const things = await response.json();
	return things;
}

...
const things = await policy.executeAsync(fetchThings);
...
```

Additionally, a custom backoff algorithm can be used:

```js
const policy = RetryPolicy.waitAndRetryForever({ retryCount: 3, sleepDurationProvider: ({ retryAttempt }) => 1000 * retryAttempt });
```

