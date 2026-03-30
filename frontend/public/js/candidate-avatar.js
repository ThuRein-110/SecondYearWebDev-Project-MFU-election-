(function () {
    function escapeSvgText(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function buildDefaultAvatarSvg(candidate) {
        const name = candidate?.name || "Candidate";
        const label = escapeSvgText(`${name} default avatar`);

        return `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="${label}">
                <defs>
                    <linearGradient id="avatarBg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#dbeafe" />
                        <stop offset="100%" stop-color="#93c5fd" />
                    </linearGradient>
                </defs>
                <rect width="160" height="160" rx="80" fill="url(#avatarBg)" />
                <circle cx="80" cy="60" r="28" fill="#ffffff" />
                <path d="M34 136c4-27 24-43 46-43s42 16 46 43" fill="#ffffff" />
            </svg>
        `.trim();
    }

    function createDefaultAvatarDataUrl(candidate) {
        const svg = buildDefaultAvatarSvg(candidate);
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    function getCandidateAvatarUrl(candidate) {
        const imageUrl = String(candidate?.image_url || "").trim();
        return imageUrl || createDefaultAvatarDataUrl(candidate);
    }

    function attachCandidateAvatar(img, candidate) {
        if (!img) return;

        const fallbackUrl = createDefaultAvatarDataUrl(candidate);
        const imageUrl = String(candidate?.image_url || "").trim();

        img.dataset.fallbackAvatar = fallbackUrl;
        img.onerror = function handleAvatarError() {
            if (img.src !== fallbackUrl) {
                img.src = fallbackUrl;
                return;
            }

            img.onerror = null;
        };
        img.src = imageUrl || fallbackUrl;
    }

    window.createDefaultAvatarDataUrl = createDefaultAvatarDataUrl;
    window.getCandidateAvatarUrl = getCandidateAvatarUrl;
    window.attachCandidateAvatar = attachCandidateAvatar;
})();
