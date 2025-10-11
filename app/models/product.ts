import cache from "#services/cache_service"
import ProductService from "#services/product_service"
import { toHtml } from '@dimerapp/markdown/utils'

export default class Product {
  declare title: string
  declare slug: string 
  declare summary: string
  declare abstract?: string

  static async all() {
    const slugs = await ProductService.getSlugs()
    const products: Product[] = []

    for (const slug of slugs) {
      const product = await this.find(slug)  
      products.push(product)
    }
    return products
  }

  static async find(slug: string) {
    if (await cache.has(slug)) {
      console.log('cache hit for', slug)
      return cache.get(slug)
    } 
    const md = await ProductService.read(slug)
    const product = new Product()

    product.title = md.frontmatter.title
    product.summary = md.frontmatter.summary
    product.slug = slug
    product.abstract = toHtml(md).contents

    await cache.set(slug, product)

    return product
  }
}