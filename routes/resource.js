const express = require('express')
const router = express.Router()
const api = require('../controllers/crud')

// create item
router.post('/', api.create)

// read item
router.get('/:id', api.read)

// update item
router.get('/:id/edit', api.update)
router.post('/:id/edit', api.update)
router.put('/:id/edit', api.update)

// delete item
router.post('/:id/delete', api.delete)
router.delete('/:id', api.delete)

// list all items
router.get('/', api.list)

// handle error from database
router.use(api.error)

module.exports = exports = router
