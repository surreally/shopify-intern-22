const axios = require('axios')
const createError = require('http-errors')
const qs = require('qs')
const queryType = require('query-types')

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
  if (req.method === 'GET') {
    // TODO: enable warehouse assignment
    // const endpoint = req.app.get('endpoint') + req.baseUrl
    res.render('new', {
      title: 'New',
      resources: req.app.get('resources'),
      resourceAttributeTypes: req.app.get('resourceAttributeTypes'),
      category: req.baseUrl
    })
  } else if (req.method === 'POST') {
    // verify attribute values' types
    const body = qs.parse(req.body) // urlencoded -> json
    const typedBody = queryType.parseObject(body) // TODO: assess
    const resources = req.app.get('resources')
    const category = req.baseUrl.slice(req.baseUrl.search(/\w/g))
    const resource = resources.find(resource => resource.category === category)
    const attributes = resource.attributes
    for (const attribute of attributes) {
      const value = typedBody[attribute.name]
      if (value === undefined && attribute.type !== 'boolean') {
        next(createError(406))
      }
      if (attribute.type === 'boolean') {
        typedBody[attribute.name] = value !== undefined
      }
      if (attribute.type === 'number' && !queryType.isNumber(value)) {
        next(createError(406))
      }
      // attribute.type === 'string': pass
    }

    // create item in database
    const endpoint = req.app.get('endpoint') + req.baseUrl
    axios.post(endpoint, typedBody)
      .then((reply) => { // object json
        res.redirect(req.baseUrl + '/' + reply.data._id)
      })
      .catch(next)
  } else {
    next(createError(400))
  }
}

function readItem (req, res, next) {
  const endpoint = req.app.get('endpoint') + req.baseUrl
  axios.get(endpoint + '/' + req.params.id)
    .then((reply) => { // object json
      res.render('detail', {
        title: 'Detail',
        resources: req.app.get('resources'),
        category: req.baseUrl,
        id: req.path,
        details: reply.data
      })
    })
    .catch(next)
}

// TODO: escape inputs, check if fields are existing
//       - for now fields are defined in conf and enforced in Create
function updateItem (req, res, next) {
  if (req.method === 'GET') {
    const endpoint = req.app.get('endpoint') + req.baseUrl
    axios.get(endpoint + '/' + req.params.id)
      .then((reply) => { // object json
        res.render('edit', {
          title: 'Edit',
          resources: req.app.get('resources'),
          category: req.baseUrl,
          details: reply.data
        })
      })
      .catch(next)
  } else if (req.method === 'POST') {
    const body = qs.parse(req.body) // urlencoded -> json
    const endpoint = req.app.get('endpoint') + req.baseUrl
    axios.put(endpoint + '/' + req.params.id, body)
      .then((reply) => { // empty
        res.redirect(req.baseUrl + '/' + req.params.id)
      })
      .catch(next)
  } else if (req.method === 'PUT') {
    const endpoint = req.app.get('endpoint') + req.baseUrl
    axios.put(endpoint + '/' + req.params.id, req.body)
      .then((reply) => { // empty
        res.redirect(req.baseUrl + '/' + req.params.id)
      })
      .catch(next)
  } else {
    next(createError(400))
  }
}

function deleteItem (req, res, next) {
  const endpoint = req.app.get('endpoint') + req.baseUrl
  axios.delete(endpoint + '/' + req.params.id)
    .then((reply) => { // empty
      res.redirect(req.baseUrl)
    })
    .catch(next)
}

function listItems (req, res, next) {
  const endpoint = req.app.get('endpoint') + req.baseUrl
  axios.get(endpoint)
    .then((reply) => { // array of json objects
      res.render('list', {
        title: 'List',
        resources: req.app.get('resources'),
        category: req.originalUrl,
        inventory: reply.data
      })
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
