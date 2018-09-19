function getRandomPositiveNumber() {
	return getRandomNonNegativeNumber() + 1;
}

function getRandomNonNegativeNumber(ceiling = 20) {
	if (ceiling < 0) {
		throw new Error('ceiling must be greater than 0.');
	}

	return Math.floor(Math.random() * ceiling);
}

function asyncDelay(wait = 20) {
	return new Promise(resolve => setTimeout(resolve, wait));
}

function asyncDelayException(wait = 20) {
	return new Promise((resolve, reject) => setTimeout(reject, wait));
}

module.exports = {
	getRandomPositiveNumber,
	getRandomNonNegativeNumber,
	asyncDelay,
	asyncDelayException,
};
