import type { HttpContext } from '@adonisjs/core/http'
import Order from '#models/order'
import OrderItem from '#models/order_item'
import ProductVM from '#view_models/product'
import db from '@adonisjs/lucid/services/db'

export default class OrdersController {
  /**
   * Display user's order history
   */
  async index({ auth, view }: HttpContext) {
    const user = auth.getUserOrFail()
    
    const orders = await Order.query()
      .where('user_id', user.id)
      .preload('items')
      .orderBy('created_at', 'desc')

    return view.render('pages/orders/index', {
      orders
    })
  }

  /**
   * Display order details
   */
  async show({ auth, params, view, response }: HttpContext) {
    const user = auth.getUserOrFail()
    
    const order = await Order.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .preload('items')
      .first()

    if (!order) {
      return response.notFound('Order not found')
    }

    // Load product details for each order item
    const allProducts = await ProductVM.all()
    const orderItemsWithProducts = order.items.map(item => {
      const product = allProducts.find(p => p.slug === item.productSlug)
      return {
        ...item.serialize(),
        product
      }
    })

    return view.render('pages/orders/show', {
      order,
      orderItems: orderItemsWithProducts
    })
  }

  /**
   * Show checkout form
   */
  async checkout({ auth, view, session, response }: HttpContext) {
    auth.getUserOrFail()
    
    // Get cart from session
    const cart = session.get('cart', {})
    const cartItems = Object.values(cart)

    if (cartItems.length === 0) {
      session.flash('error', 'Your cart is empty')
      return response.redirect().toRoute('cart.index')
    }

    // Load products for cart items
    const allProducts = await ProductVM.all()
    const cartItemsWithProducts = cartItems.map((item: any) => {
      const product = allProducts.find(p => p.slug === item.slug)
      return {
        ...item,
        product
      }
    })

    // Calculate total
    const total = cartItemsWithProducts.reduce((sum: number, item: any) => {
      return sum + (item.product?.price || 0) * item.quantity
    }, 0)

    return view.render('pages/orders/checkout', {
      cartItems: cartItemsWithProducts,
      total
    })
  }

  /**
   * Process checkout and create order
   */
  async store({ auth, request, session, response }: HttpContext) {
    const user = auth.getUserOrFail()
    
    // Get cart from session
    const cart = session.get('cart', {})
    const cartItems = Object.values(cart)

    if (cartItems.length === 0) {
      session.flash('error', 'Your cart is empty')
      return response.redirect().toRoute('cart.index')
    }

    // Validate request
    const data = request.only(['shipping_address', 'payment_method', 'notes'])

    if (!data.shipping_address || !data.payment_method) {
      session.flash('error', 'Please fill in all required fields')
      return response.redirect().back()
    }

    // Load products to calculate total
    const allProducts = await ProductVM.all()
    let total = 0
    const orderItemsData: any[] = []

    for (const item of cartItems as any[]) {
      const product = allProducts.find(p => p.slug === item.slug)
      if (product) {
        const itemTotal = product.price * item.quantity
        total += itemTotal
        orderItemsData.push({
          productSlug: item.slug,
          quantity: item.quantity,
          price: product.price
        })
      }
    }

    // Create order in a transaction
    const trx = await db.transaction()

    try {
      const order = await Order.create({
        userId: user.id,
        total,
        status: 'pending',
        shippingAddress: data.shipping_address,
        paymentMethod: data.payment_method,
        notes: data.notes || null
      }, { client: trx })

      // Create order items
      for (const itemData of orderItemsData) {
        await OrderItem.create({
          orderId: order.id,
          ...itemData
        }, { client: trx })
      }

      await trx.commit()

      // Clear cart
      session.put('cart', {})
      session.flash('success', 'Order placed successfully!')

      return response.redirect().toRoute('orders.show', { id: order.id })
    } catch (error) {
      await trx.rollback()
      console.error('Order creation error:', error)
      session.flash('error', 'Failed to create order. Please try again.')
      return response.redirect().back()
    }
  }

  /**
   * Cancel an order (only if pending)
   */
  async cancel({ auth, params, session, response }: HttpContext) {
    const user = auth.getUserOrFail()
    
    const order = await Order.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .first()

    if (!order) {
      session.flash('error', 'Order not found')
      return response.redirect().toRoute('orders.index')
    }

    if (order.status !== 'pending') {
      session.flash('error', 'Only pending orders can be cancelled')
      return response.redirect().back()
    }

    order.status = 'cancelled'
    await order.save()

    session.flash('success', 'Order cancelled successfully')
    return response.redirect().toRoute('orders.show', { id: order.id })
  }
}
