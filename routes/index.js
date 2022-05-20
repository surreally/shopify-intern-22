const express = require('express')
const router = express.Router()

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'Inventories',
    resources: req.app.get('resources')
  })
})

module.exports = exports = router
