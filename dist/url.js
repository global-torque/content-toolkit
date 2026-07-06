const CYRILLIC_TO_LATIN = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'i',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
    є: 'ye',
    і: 'i',
    ї: 'yi',
    ґ: 'g',
};
function transliterateCyrillic(value) {
    return value.replace(/[А-Яа-яЁёЄєІіЇїҐґ]/g, (char) => {
        const replacement = CYRILLIC_TO_LATIN[char.toLowerCase()] ?? char;
        return char === char.toUpperCase() ? replacement.toUpperCase() : replacement;
    });
}
function normalizeFolderSegment(value) {
    return value.replace(/^\/+|\/+$/g, '').trim().toLowerCase();
}
function splitPath(value) {
    return {
        leading: value.startsWith('/'),
        trailing: value.length > 1 && value.endsWith('/'),
        segments: value.split('/').filter(Boolean),
    };
}
function joinPath(leading, trailing, segments) {
    const path = `${leading ? '/' : ''}${segments.join('/')}${trailing && segments.length ? '/' : ''}`;
    return path || (leading ? '/' : '');
}
function removeFolderSegments(value, folders) {
    if (folders.length === 0) {
        return value;
    }
    const removeSet = new Set(folders.map(normalizeFolderSegment).filter(Boolean));
    const { leading, trailing, segments } = splitPath(value);
    return joinPath(leading, trailing, segments.filter((segment) => !removeSet.has(normalizeFolderSegment(segment))));
}
function removeAdjacentDuplicateSegments(value) {
    const { leading, trailing, segments } = splitPath(value);
    const deduped = [];
    segments.forEach((segment) => {
        if (deduped[deduped.length - 1]?.toLowerCase() === segment.toLowerCase()) {
            return;
        }
        deduped.push(segment);
    });
    return joinPath(leading, trailing, deduped);
}
export function urlFormat(url, options = {}) {
    const { lowercase = true, removeDuplicateSegments = false, removeFolders = [], transliterate = false, } = options;
    let cleanUrl = transliterate ? transliterateCyrillic(url.replace(/-/g, ' ')) : url;
    cleanUrl = removeFolderSegments(cleanUrl, removeFolders);
    cleanUrl = cleanUrl.replace(/[^\w./-]+/g, '-').replace(/\s+/g, '-');
    if (lowercase) {
        cleanUrl = cleanUrl.toLowerCase();
    }
    if (removeDuplicateSegments) {
        cleanUrl = removeAdjacentDuplicateSegments(cleanUrl);
    }
    return cleanUrl || '/';
}
export function transliteratedUrlFormat(url, options = {}) {
    return urlFormat(url, {
        ...options,
        transliterate: options.transliterate ?? true,
    });
}
//# sourceMappingURL=url.js.map