const express = require('express')
const router = express.Router()
const conf = require('../conf/conf.json')

// TODO: evaluate if I need a separate router (probs yes) and
//       how this could be better
for (const { resource, route } of conf.resources) {
  const subRouter = require('./' + route)
  router.use('/' + resource, subRouter)
}

// router.use('/:resource', fallback) // use custom fallback instead of 404

module.exports = exports = router
