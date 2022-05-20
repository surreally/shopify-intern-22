const axios = require('axios')
const createError = require('http-errors')

exports.create = createItem

exports.read = readItem

exports.update = updateItem

exports.delete = deleteItem

exports.list = listItems

exports.error = extendAxiosError

module.exports = exports

// utilities

// note: req.baseUrl is of the form '/item'

function createItem (req, res, next) {
  const endpoint = req.app.get('endpoint') + req.baseUrl
  axios.post(endpoint, req.body)
    .then((reply) => {
      res.json(reply.data)
    })
    .catch(next)
}

function readItem (req, res, next) {
  const endpoint = req.app.get('endpoint') + req.baseUrl
  axios.get(endpoint + '/' + req.params.id)
    .then((reply) => {
      res.json(reply.data)
    })
    .catch(next)
}

function updateItem (req, res, next) {
  const endpoint = req.app.get('endpoint') + req.baseUrl
  axios.put(endpoint + '/' + req.params.id, req.body)
    .then((reply) => {
      res.json(reply.data)
    })
    .catch(next)
}

function deleteItem (req, res, next) {
  const endpoint = req.app.get('endpoint') + req.baseUrl
  axios.delete(endpoint + '/' + req.params.id)
    .then((reply) => {
      res.json(reply.data)
    })
    .catch(next)
}

function listItems (req, res, next) {
  const endpoint = req.app.get('endpoint') + req.baseUrl
  axios.get(endpoint)
    .then((reply) => {
      res.json(reply.data)
    })
    .catch(next)
}

function extendAxiosError (error, req, res, next) {
  // https://axios-http.com/docs/handling_errors
  if (error.response) {
    const err = createError(error.response.status)
    err.headers = error.response.headers
    next(err)
  } else if (error.request) {
    const err = createError(400)
    next(err)
  } else {
    const err = createError(error.message)
    next(err)
  }
}
