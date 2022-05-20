const axios = require('axios')
const conf = require('../conf/conf.json')
const database = conf.database

exports.create = createItem

exports.read = readItem

exports.update = updateItem

exports.delete = deleteItem

exports.list = listItems

module.exports = exports

// utilities

// note: req.baseUrl is of the form '/item'

const toyEndpoint = database.crudcrud + '/' + database.dev
const endpoint = process.env.NODE_ENV === 'development'
  ? toyEndpoint
  : database.crudcrud + '/' + database.prod

function createItem (req, res, next) {
  axios.post(endpoint + req.baseUrl, req.body)
    .then((reply) => {
      // echo back object created
      res.json(reply.data)
    })
    .catch((err) => {
      next(err)
    })
}

function readItem (req, res, next) {
  axios.get(endpoint + req.baseUrl + '/' + req.params.id)
    .then((reply) => {
      res.json(reply.data)
    })
    .catch((err) => {
      next(err)
    })
}

function updateItem (req, res, next) {
  res.send('Not implemented: update')
}

function deleteItem (req, res, next) {
  axios.delete(endpoint + req.baseUrl + '/' + req.params.id)
    .then((reply) => {
      res.json(reply.data)
    })
    .catch((err) => {
      next(err)
    })
}

function listItems (req, res, next) {
  axios.get(toyEndpoint + req.baseUrl)
    .then((reply) => {
      res.json(reply.data)
    })
    .catch((err) => {
      next(err)
    })
}
