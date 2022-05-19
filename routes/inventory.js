const express = require('express')
const router = express.Router()
const api = require('../controllers/crud')

// create item
router.post('/', api.create)

// read item
router.get('/:id', api.read)

// update item
router.put('/:id', api.update)

// delete item
router.delete('/:id', api.delete)

// list all items
router.get('/', api.list)

module.exports = exports = router
