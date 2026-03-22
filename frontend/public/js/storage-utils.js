(function (global) {
    if (!global) {
        return;
    }

    const STORAGE_KEY = 'voted_candidate';

    function tryStore(storage, value) {
        if (!storage || typeof storage.setItem !== 'function') {
            return false;
        }
        try {
            storage.setItem(STORAGE_KEY, value);
            return true;
        } catch (err) {
            return false;
        }
    }

    function cacheVotedCandidate(candidateId) {
        if (candidateId === undefined || candidateId === null) {
            return;
        }
        const normalized = String(candidateId).trim();
        if (!normalized) {
            return;
        }

        const candidates = [];

        if (typeof global.localStorage !== 'undefined') {
            candidates.push(global.localStorage);
        }

        if (typeof global.sessionStorage !== 'undefined') {
            candidates.push(global.sessionStorage);
        }

        for (const store of candidates) {
            if (tryStore(store, normalized)) {
                return;
            }
        }

        global.__votedCandidateFallback = normalized;
    }

    global.cacheVotedCandidate = cacheVotedCandidate;
})(typeof window !== 'undefined' ? window : null);
