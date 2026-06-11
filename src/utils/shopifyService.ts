export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  imageUrl: string;
  handle: string;
  tags: string[];
}

export interface ShopifyDiscount {
  code: string;
  value: number;
  valueType: 'percentage' | 'fixed_amount';
  createdAt: string;
  expiresAt: string;
  usageLimit: number | null;
}

export class ShopifyService {
  private static readonly SHOPIFY_STORE_DOMAIN = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN || '';
  private static readonly SHOPIFY_STOREFRONT_ACCESS_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN || '';
  private static readonly API_VERSION = '2025-01';

  private static getStorefrontApiUrl(): string {
    if (!this.SHOPIFY_STORE_DOMAIN) {
      console.warn('Shopify store domain not configured - using mock mode');
      return '';
    }
    return `https://${this.SHOPIFY_STORE_DOMAIN}/api/${this.API_VERSION}/graphql.json`;
  }

  private static isConfigured(): boolean {
    return !!this.SHOPIFY_STORE_DOMAIN && !!this.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  }

  public static async searchProducts(query: string, limit = 10): Promise<ShopifyProduct[]> {
    if (!this.isConfigured()) {
      return this.getMockProducts(query);
    }

    try {
      const response = await fetch(this.getStorefrontApiUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': this.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          query: `
            query SearchProducts($query: String!, $limit: Int!) {
              products(first: $limit, query: $query) {
                edges {
                  node {
                    id
                    title
                    description
                    handle
                    tags
                    priceRange {
                      minVariantPrice {
                        amount
                        currencyCode
                      }
                    }
                    images(first: 1) {
                      edges {
                        node {
                          url
                        }
                      }
                    }
                  }
                }
              }
            }
          `,
          variables: { query, limit },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors && data.errors.length > 0) {
        throw new Error(data.errors[0].message);
      }

      return data.data.products.edges.map((edge: any) => ({
        id: edge.node.id,
        title: edge.node.title,
        description: edge.node.description,
        handle: edge.node.handle,
        tags: edge.node.tags,
        price: `${edge.node.priceRange.minVariantPrice.amount} ${edge.node.priceRange.minVariantPrice.currencyCode}`,
        imageUrl: edge.node.images.edges[0]?.node.url || '',
      }));
    } catch (error) {
      console.error('Shopify product search error:', error);
      return this.getMockProducts(query);
    }
  }

  public static generateMockDiscountCode(
    value: number = 10,
    valueType: 'percentage' | 'fixed_amount' = 'percentage',
    usageLimit: number | null = 1,
    expiresInDays: number = 30
  ): ShopifyDiscount {
    const code = this.generateDiscountCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
    
    return {
      code: code,
      value: value,
      valueType: valueType,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      usageLimit: usageLimit,
    };
  }

  private static generateDiscountCode(): string {
    const prefix = 'TUCO';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  private static getMockProducts(query: string): ShopifyProduct[] {
    const mockProducts: ShopifyProduct[] = [
      {
        id: 'gid://shopify/Product/1',
        title: 'tuco Baby Sunscreen SPF 50+',
        description: 'Gentle mineral sunscreen for sensitive baby skin',
        handle: 'tuco-baby-sunscreen-spf-50',
        tags: ['sunscreen', 'baby', 'skincare'],
        price: '₹499 INR',
        imageUrl: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=baby%20sunscreen%20bottle%20product%20photography&image_size=square',
      },
      {
        id: 'gid://shopify/Product/2',
        title: 'tuco Kids Moisturizing Lotion',
        description: 'Nourishing lotion for daily use on kids',
        handle: 'tuco-kids-moisturizing-lotion',
        tags: ['moisturizer', 'kids', 'skincare'],
        price: '₹399 INR',
        imageUrl: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=kids%20moisturizer%20lotion%20bottle&image_size=square',
      },
    ];

    const lowerQuery = query.toLowerCase();
    return mockProducts.filter(product => 
      product.title.toLowerCase().includes(lowerQuery) ||
      product.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
}
