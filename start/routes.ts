/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/
import fs from 'node:fs/promises'
import app from '@adonisjs/core/services/app' 
import router from '@adonisjs/core/services/router'
import { Exception } from '@adonisjs/core/exceptions'

router.on('/').render('pages/home').as('home')

router
    .get('/products/:slug', async (ctx) => {

        const url = app.makeURL(`resources/products/${ctx.params.slug}.html`)

        try {
             const product = await fs.readFile(url, 'utf8')
             ctx.view.share({ product })
        } catch (error) {
            throw new Exception(`could not find product called ${ctx.params.slug}`, {
                code: 'E_NOT_FOUND',
                status: 404
            })
        }
       
        return ctx.view.render('pages/products/show')

    })
    .as('products.show')
    .where('slug', router.matchers.slug())


    