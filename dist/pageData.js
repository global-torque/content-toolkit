import { getFilerImageSrcset } from './filerImage.js';
import { transliteratedUrlFormat, urlFormat } from './url.js';
const DEFAULT_IMAGE = '/images/sharing.png';
const DEFAULT_SUMMARY_LENGTH = 200;
export const legacyCoverNormalizeFrontmatterOptions = {
    ensureSlug: true,
    imageSrcset: false,
    legacyCoverImage: 'map-to-top-level',
    preserveRawUrl: true,
    urlFormatter: transliteratedUrlFormat,
};
function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
}
function resolveImageSrcset(imageUrl, resolver) {
    if (typeof resolver === 'function') {
        return resolver(imageUrl);
    }
    if (resolver === true) {
        return getFilerImageSrcset(imageUrl);
    }
    return undefined;
}
function isLegacyCoverFrontmatter(cover) {
    return typeof cover === 'object' && cover !== null;
}
function mapLegacyCoverImage(frontmatter) {
    if (!hasOwn(frontmatter, 'cover')) {
        return;
    }
    const cover = frontmatter.cover;
    if (!isLegacyCoverFrontmatter(cover)) {
        delete frontmatter.cover;
        return;
    }
    if (!hasOwn(frontmatter, 'image') && cover.image) {
        frontmatter.image = cover.image;
    }
    if (!hasOwn(frontmatter, 'srcset') && cover.srcset) {
        frontmatter.srcset = cover.srcset;
    }
    delete frontmatter.cover;
}
const FRONTMATTER_PATTERN = /^---[^\S\r\n]*\r?\n[\s\S]*?\r?\n---[^\S\r\n]*(?:\r?\n|$)/;
function getMarkdownSummaryInput(source, length) {
    const frontmatterMatch = FRONTMATTER_PATTERN.exec(source);
    const contentStart = frontmatterMatch ? frontmatterMatch[0].length : 0;
    return source.slice(contentStart, contentStart + length);
}
function stripHtml(value) {
    return value.replace(/<[^>]*>/g, '');
}
function stripMarkdown(value) {
    return value
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^>\s?/gm, '')
        .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
        .replace(/^\s*[-*_]{3,}\s*$/gm, '');
}
function stripHtmlAndMarkdown(value) {
    return stripMarkdown(stripHtml(value));
}
function getSummary(value, length = DEFAULT_SUMMARY_LENGTH) {
    return stripHtmlAndMarkdown(value.replaceAll('"', "'").slice(0, length)).trim();
}
function getString(value) {
    return typeof value === 'string' ? value : '';
}
export function getSlugFromURL(url) {
    return url.split('/')?.pop()?.replace('.html', '').trim();
}
export function getImage(img, defaultImage = DEFAULT_IMAGE) {
    return img === undefined || img === '' ? defaultImage : img;
}
export function getUrl(pageData, formatter = urlFormat) {
    const rawUrl = pageData.relativePath
        ? `/${pageData.relativePath.replace(/index\.md$/, '').replace(/\.md$/, '')}`
        : (pageData.url ?? '');
    return formatter(rawUrl);
}
export function normalizeFrontmatter(pageData, options = {}) {
    const resolvedOptions = {
        defaultImage: DEFAULT_IMAGE,
        ensureSlug: true,
        ensureSummary: false,
        imageSrcset: false,
        legacyCoverImage: 'reject',
        preserveRawUrl: true,
        summaryLength: DEFAULT_SUMMARY_LENGTH,
        urlFormatter: urlFormat,
        ...options,
    };
    const { frontmatter } = pageData;
    if (hasOwn(frontmatter, 'cover')) {
        if (resolvedOptions.legacyCoverImage === 'reject') {
            throw new Error('Frontmatter "cover" is not supported. Use top-level image/srcset instead.');
        }
        mapLegacyCoverImage(frontmatter);
    }
    const rawUrl = pageData.url
        ?? (pageData.relativePath ? `/${pageData.relativePath.replace(/index\.md$/, '').replace(/\.md$/, '')}` : undefined);
    frontmatter.url = getUrl(pageData, resolvedOptions.urlFormatter);
    if (resolvedOptions.preserveRawUrl
        && !hasOwn(frontmatter, 'rawUrl')
        && rawUrl) {
        frontmatter.rawUrl = rawUrl;
    }
    if (resolvedOptions.ensureSlug
        && !hasOwn(frontmatter, 'slug')) {
        frontmatter.slug = getSlugFromURL(frontmatter.url);
    }
    if (resolvedOptions.ensureSummary
        && !hasOwn(frontmatter, 'summary')) {
        const markdownSource = getString(pageData.src);
        const sourceFallback = markdownSource
            ? getMarkdownSummaryInput(markdownSource, resolvedOptions.summaryLength)
            : '';
        const description = getString(frontmatter.description);
        const summarySource = description.trim() ? description : sourceFallback;
        frontmatter.summary = getSummary(summarySource, resolvedOptions.summaryLength);
    }
    const image = getImage(frontmatter.image, resolvedOptions.defaultImage);
    const generatedSrcset = resolveImageSrcset(image, resolvedOptions.imageSrcset);
    frontmatter.image = image;
    if (generatedSrcset || frontmatter.srcset) {
        frontmatter.srcset = generatedSrcset ?? frontmatter.srcset;
    }
    return frontmatter;
}
//# sourceMappingURL=pageData.js.map