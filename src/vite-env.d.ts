interface ImportMetaEnv {
  readonly VITE_SHOPIFY_STORE_DOMAIN: string;
  readonly VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}
