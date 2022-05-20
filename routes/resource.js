const express = require('express')
const router = express.Router()
const conf = require('../conf/conf.json')

// TODO: evaluate and improve
for (const { resource, route } of conf.resources) {
  const subRouter = require('./' + route)
  router.use('/' + resource, subRouter)
}

module.exports = exports = router
