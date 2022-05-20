const express = require('express')
const router = express.Router()
const conf = require('../conf/conf.json')

// TODO: evaluate and improve
for (const { category } of conf.resources) {
  const subRouter = require('./resource')
  router.use('/' + category, subRouter)
}

module.exports = exports = router
