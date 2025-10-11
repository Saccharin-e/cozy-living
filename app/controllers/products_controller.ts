import type { HttpContext } from '@adonisjs/core/http'
import Product from '#models/product'

export default class ProductsController {

  async index({ view }: HttpContext) {

    const products = await Product.all()

    return view.render('pages/home', { products })
  }
  
  async show({ view, params }: HttpContext) {
    const product = await Product.find(params.slug)

    return view.render('pages/products/show', { product })
  }
  
}