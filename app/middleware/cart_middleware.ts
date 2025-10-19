import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'

/**
 * Cart middleware shares cart data with all views
 */
export default class CartMiddleware {
  handle(ctx: HttpContext, next: NextFn) {
    // Make cart count available to all views
    const cart = ctx.session.get('cart', []) as Array<{ slug: string; quantity: number }>
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
    ctx.view.share({ cartCount })

    return next()
  }
}
