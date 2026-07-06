import { getFilerImageSrcset } from './filerImage.js';
import { transliteratedUrlFormat, urlFormat } from './url.js';
const DEFAULT_IMAGE = '/images/sharing.png';
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
        imageSrcset: false,
        legacyCoverImage: 'reject',
        preserveRawUrl: true,
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
    const image = getImage(frontmatter.image, resolvedOptions.defaultImage);
    const generatedSrcset = resolveImageSrcset(image, resolvedOptions.imageSrcset);
    frontmatter.image = image;
    if (generatedSrcset || frontmatter.srcset) {
        frontmatter.srcset = generatedSrcset ?? frontmatter.srcset;
    }
    return frontmatter;
}
//# sourceMappingURL=pageData.js.map