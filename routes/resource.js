const express = require('express')
const router = express.Router()
const api = require('../controllers/crud')

// ignore query strings
router.use(api.stripQuery)

// create item
router.get('/new', api.create)
router.post('/new',
  api.escape,
  api.sanitize,
  api.create)

// read item
router.get('/:id',
  api.checkID,
  api.read)

// update item
router.get('/:id/edit',
  api.checkID,
  api.update)
router.post('/:id/edit',
  api.checkID,
  api.escape,
  api.sanitize,
  api.update)
router.put('/:id',
  api.checkID,
  api.escape,
  api.sanitize,
  api.update)

// delete item
router.post('/:id/delete',
  api.checkID,
  api.delete) // ignore request body
router.delete('/:id',
  api.checkID,
  api.delete)

// list all items
router.get('/', api.list)

// handle error from database
router.use(api.error)

module.exports = exports = router
