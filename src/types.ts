export interface BaseFrontmatter {
  url: string;
  rawUrl?: string;
  title?: string;
  description?: string;
  slug?: string;
  image: string;
  srcset?: string;
  author?: string | string[];
  lang?: string;
  draft?: boolean;
  tags?: string[];
  layout?: string;
  order?: number;
}

export interface RawFrontmatterInput extends Partial<BaseFrontmatter> {
  [key: string]: unknown;
}

export interface ArticleFrontmatter extends BaseFrontmatter {
  subTitle?: string;
  subtitle?: string;
  publishDate?: string;
  updateDate?: string;
  is_main?: boolean;
  route?: string;
  pageSrc?: string;
  products?: string;
  summary?: string;
  menuIcon?: string;
  position?: string;
}

export interface WebdevelopFrontmatter extends ArticleFrontmatter {
  title: string;
  description: string;
  publishDate: string;
  image: string;
  author?: string;
  is_main: boolean;
  mtime?: number;
}

export interface IFrontmatter extends WebdevelopFrontmatter {}

export interface IPostContent extends IFrontmatter {
  content: string;
}
