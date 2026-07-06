export interface FrontmatterLike extends Record<string, unknown> {
    url?: string;
    rawUrl?: string;
    slug?: string;
    image?: string;
    srcset?: string;
    cover?: {
        image?: string;
        srcset?: string;
    };
}
export interface PageDataLike {
    frontmatter: FrontmatterLike;
    relativePath?: string;
    url?: string;
    filePath?: string;
    src?: string;
}
export type ImageSrcsetResolver = (imageUrl?: string) => string | undefined;
export interface NormalizeFrontmatterOptions {
    defaultImage?: string;
    ensureSlug?: boolean;
    imageSrcset?: boolean | ImageSrcsetResolver;
    legacyCoverImage?: 'reject' | 'map-to-top-level';
    preserveRawUrl?: boolean;
    urlFormatter?: (url: string) => string;
}
export type NormalizedFrontmatter<TFrontmatter extends FrontmatterLike = FrontmatterLike> = Omit<TFrontmatter, 'url' | 'image'> & {
    url: string;
    image: string;
    srcset?: string;
    rawUrl?: string;
    slug?: string;
};
export declare const legacyCoverNormalizeFrontmatterOptions: NormalizeFrontmatterOptions;
export declare function getSlugFromURL(url: string): string | undefined;
export declare function getImage(img?: string, defaultImage?: string): string;
export declare function getUrl(pageData: PageDataLike, formatter?: (url: string) => string): string;
export declare function normalizeFrontmatter<TFrontmatter extends FrontmatterLike>(pageData: PageDataLike & {
    frontmatter: TFrontmatter;
}, options?: NormalizeFrontmatterOptions): NormalizedFrontmatter<TFrontmatter>;
//# sourceMappingURL=pageData.d.ts.map