export interface UrlFormatOptions {
    transliterate?: boolean;
    removeFolders?: readonly string[];
    removeDuplicateSegments?: boolean;
    lowercase?: boolean;
}
export declare function urlFormat(url: string, options?: UrlFormatOptions): string;
export declare function transliteratedUrlFormat(url: string, options?: UrlFormatOptions): string;
//# sourceMappingURL=url.d.ts.map