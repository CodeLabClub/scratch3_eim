class Timer {
    // fork from https://github.com/LLK/scratch-vm/blob/develop/src/util/timer.js
    constructor (nowObj = Timer.nowObj) {
        /**
         * Used to store the start time of a timer action.
         * Updated when calling `timer.start`.
         */
        this.startTime = 0;

        /**
         * Used to pass custom logic for determining the value for "now",
         * which is sometimes useful for compatibility with Scratch 2
         */
        this.nowObj = nowObj;
    }

    /**
     * Disable use of self.performance for now as it results in lower performance
     * However, instancing it like below (caching the self.performance to a local variable) negates most of the issues.
     * @type {boolean}
     */
    static get USE_PERFORMANCE () {
        return false;
    }

    /**
     * Legacy object to allow for us to call now to get the old style date time (for backwards compatibility)
     * @deprecated This is only called via the nowObj.now() if no other means is possible...
     */
    static get legacyDateCode () {
        return {
            now: function () {
                return new Date().getTime();
            }
        };
    }

    /**
     * Use this object to route all time functions through single access points.
     */
    static get nowObj () {
        if (Timer.USE_PERFORMANCE && typeof self !== 'undefined' && self.performance && 'now' in self.performance) {
            return self.performance;
        } else if (Date.now) {
            return Date;
        }
        return Timer.legacyDateCode;
    }

    /**
     * Return the currently known absolute time, in ms precision.
     * @returns {number} ms elapsed since 1 January 1970 00:00:00 UTC.
     */
    time () {
        return this.nowObj.now();
    }

    /**
     * Returns a time accurate relative to other times produced by this function.
     * If possible, will use sub-millisecond precision.
     * If not, will use millisecond precision.
     * Not guaranteed to produce the same absolute values per-system.
     * @returns {number} ms-scale accurate time relative to other relative times.
     */
    relativeTime () {
        return this.nowObj.now();
    }

    /**
     * Start a timer for measuring elapsed time,
     * at the most accurate precision possible.
     */
    start () {
        this.startTime = this.nowObj.now();
    }

    timeElapsed () {
        return this.nowObj.now() - this.startTime;
    }

    /**
     * Call a handler function after a specified amount of time has elapsed.
     * @param {function} handler - function to call after the timeout
     * @param {number} timeout - number of milliseconds to delay before calling the handler
     * @returns {number} - the ID of the new timeout
     */
    setTimeout (handler, timeout) {
        return global.setTimeout(handler, timeout);
    }

    /**
     * Clear a timeout from the pending timeout pool.
     * @param {number} timeoutId - the ID returned by `setTimeout()`
     * @memberof Timer
     */
    clearTimeout (timeoutId) {
        global.clearTimeout(timeoutId);
    }
}

class RateLimiter {
    // fork from https://github.com/LLK/scratch-vm/blob/develop/src/util/rateLimiter.js

    /**
     * A utility for limiting the rate of repetitive send operations, such as
     * bluetooth messages being sent to hardware devices. It uses the token bucket
     * strategy: a counter accumulates tokens at a steady rate, and each send costs
     * a token. If no tokens remain, it's not okay to send.
     * @param {number} maxRate the maximum number of sends allowed per second
     * @constructor
     */
    constructor (maxRate) {
        /**
         * The maximum number of tokens.
         * @type {number}
         */
        this._maxTokens = maxRate;

        /**
         * The interval in milliseconds for refilling one token. It is calculated
         * so that the tokens will be filled to maximum in one second.
         * @type {number}
         */
        this._refillInterval = 1000 / maxRate;

        /**
         * The current number of tokens in the bucket.
         * @type {number}
         */
        this._count = this._maxTokens;

        this._timer = new Timer();
        this._timer.start();

        /**
         * The last time in milliseconds when the token count was updated.
         * @type {number}
         */
        this._lastUpdateTime = this._timer.timeElapsed();
    }

    /**
     * Check if it is okay to send a message, by updating the token count,
     * taking a token and then checking if we are still under the rate limit.
     * @return {boolean} true if we are under the rate limit
     */
    okayToSend () {
        // Calculate the number of tokens to refill the bucket with, based on the
        // amount of time since the last refill.
        const now = this._timer.timeElapsed();
        const timeSinceRefill = now - this._lastUpdateTime;
        const refillCount = Math.floor(timeSinceRefill / this._refillInterval);

        // If we're adding at least one token, reset _lastUpdateTime to now.
        // Otherwise, don't reset it so that we can continue measuring time until
        // the next refill.
        if (refillCount > 0) {
            this._lastUpdateTime = now;
        }

        // Refill the tokens up to the maximum
        this._count = Math.min(this._maxTokens, this._count + refillCount);

        // If we have at least one token, use one, and it's okay to send.
        if (this._count > 0) {
            this._count--;
            return true;
        }
        return false;
    }
}

module.exports = RateLimiter;