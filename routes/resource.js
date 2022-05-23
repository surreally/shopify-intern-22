const express = require('express')
const router = express.Router()
const api = require('../controllers/crud')

// ignore query strings
router.use(api.stripQuery)

// check ID if present
router.param('id', api.checkID)

// delete item: request body ignored
router.post('/:id/delete', api.delete)
router.delete('/:id', api.delete)

// escape and sanitize request bodies with resource attributes
router.post('*', api.escape, api.sanitize)
router.put('*', api.escape, api.sanitize)

// create item
router.get('/new', api.createGET)
router.post('/new', api.create)

// read item
router.get('/:id', api.read)

// update item
router.get('/:id/edit', api.updateGET)
router.post('/:id/edit', api.update)
router.put('/:id', api.update)

// list all items
router.get('/', api.list)

// handle error from database
router.use(api.error)

module.exports = exports = router
