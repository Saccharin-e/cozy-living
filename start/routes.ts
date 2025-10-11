/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import RedisController from '#controllers/redis_controller'
import router from '@adonisjs/core/services/router'
const ProductsController = () => import('#controllers/products_controller')

router.get('/',[ProductsController, 'index'] ).as('home')

router
    .get('/products/:slug', [ProductsController, 'show'])
    .as('products.show')
    .where('slug', router.matchers.slug())


router.delete('/redis/flush', [RedisController, 'flush']).as('redis.flush')
router.get('/redis/:slug', [RedisController, 'destroy']).as('redis.destroy')    