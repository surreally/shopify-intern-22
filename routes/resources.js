const express = require('express')
const router = express.Router()
const conf = require('../conf/conf.json')
const subRouter = require('./resource')

for (const { category } of conf.resources) {
  router.use('/' + category, subRouter)
}

module.exports = exports = router
