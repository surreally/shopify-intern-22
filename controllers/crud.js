const axios = require('axios')
const createError = require('http-errors')
const queryType = require('query-types')
const validator = require('validator')

exports.create = createItem

exports.read = readItem

exports.update = updateItem

exports.delete = deleteItem

exports.list = listItems

exports.error = handleError

exports.escape = escapeInputs

exports.sanitize = sanitizeAttributeTypes

module.exports = exports

// utilities

// note: req.baseUrl is of the form '/item'

function createItem (req, res, next) {
  if (req.method === 'GET') {
    // TODO: enable warehouse assignment
    // const endpoint = req.app.get('endpoint') + req.baseUrl

    // create item in database
    res.render('edit', {
      title: 'New',
      resources: req.app.get('resources'),
      attributeTypes: req.app.get('resourceAttributeTypes'),
      category: req.baseUrl
    })
  } else if (req.method === 'POST') {
    // create item in database
    const endpoint = req.app.get('endpoint') + req.baseUrl
    axios.post(endpoint, req.body)
      .then((reply) => { // object json
        res.redirect(req.baseUrl + '/' + reply.data._id)
      })
      .catch(next)
  } else {
    return next(createError(400))
  }
}

function readItem (req, res, next) {
  // read item from database
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

function updateItem (req, res, next) {
  if (req.method === 'GET') {
    // read item to update from database
    const endpoint = req.app.get('endpoint') + req.baseUrl
    axios.get(endpoint + '/' + req.params.id)
      .then((reply) => { // object json
        res.render('edit', {
          title: 'Edit',
          resources: req.app.get('resources'),
          attributeTypes: req.app.get('resourceAttributeTypes'),
          category: req.baseUrl,
          details: reply.data
        })
      })
      .catch(next)
  } else if (req.method === 'POST') {
    // update item in database
    const endpoint = req.app.get('endpoint') + req.baseUrl
    axios.put(endpoint + '/' + req.params.id, req.body)
      .then((reply) => { // empty
        res.redirect(req.baseUrl + '/' + req.params.id)
      })
      .catch(next)
  } else if (req.method === 'PUT') {
    // update item in database
    const endpoint = req.app.get('endpoint') + req.baseUrl
    axios.put(endpoint + '/' + req.params.id, req.body)
      .then((reply) => { // empty
        res.redirect(req.baseUrl + '/' + req.params.id)
      })
      .catch(next)
  } else {
    return next(createError(400))
  }
}

function deleteItem (req, res, next) {
  // delete item in database
  const endpoint = req.app.get('endpoint') + req.baseUrl
  axios.delete(endpoint + '/' + req.params.id)
    .then((reply) => { // empty
      res.redirect(req.baseUrl)
    })
    .catch(next)
}

function listItems (req, res, next) {
  // read items from database
  const endpoint = req.app.get('endpoint') + req.baseUrl
  axios.get(endpoint)
    .then((reply) => { // array of json objects
      res.render('list', {
        title: 'List',
        resources: req.app.get('resources'),
        detailLevel: req.app.get('resourceListDetailLevel'),
        category: req.originalUrl,
        inventory: reply.data
      })
    })
    .catch(next)
}

function handleError (error, req, res, next) {
  // if (createError.isHttpError(error)) return next(error)
  // - somehow this fails: "createError.isHttpError is a property", not a function
  if (error instanceof createError.HttpError) return next(error)
  // https://axios-http.com/docs/handling_errors
  if (error.response) {
    const err = createError(error.response.status)
    err.headers = error.response.headers
    return next(err)
  } else if (error.request) {
    const err = createError(400)
    return next(err)
  } else {
    return next(error)
  }
}

// escape all names and values from request body json
function escapeInputs (req, res, next) {
  // request payload was json -> req.body has Object prototype
  // request payload was urlencoded -> req.body has null prototype
  // (I guess express.json() and express.urlencoded() have diff implementations)
  const unescaped = Object.entries(req.body)
  const escaped = Object.create(null)
  // TODO: figure out hwo to move these out
  unescaped.forEach(function escapeProperty (property) {
    const [key, value] = property.map(function escapeField (field) {
      // for now, coerce every key and value into a string
      field = validator.trim(field + '')
      if (!validator.isLength(field, { min: 1 })) return next(createError(406))
      field = validator.escape(field)
      return field
    })
    escaped[key] = value
  })
  req.body = escaped
  return next()
}

// enforce resource attribute types for POST and PUT inputs
function sanitizeAttributeTypes (req, res, next) {
  if (req.method !== 'POST' && req.method !== 'PUT') return next()

  const typedBody = queryType.parseObject(req.body) // TODO: assess use of qT
  const resources = req.app.get('resources')
  const category = req.baseUrl.slice(req.baseUrl.search(/\w/g))
  const resource = resources.find(resource => resource.category === category)
  const attributes = resource.attributes

  // keep attribute order
  const orderedBody = {}
  for (const attribute of attributes) {
    let value = typedBody[attribute.name]

    if (value === undefined && attribute.type !== 'boolean') {
      return next(createError(406))
    }
    if (attribute.type === 'boolean') {
      value = value !== undefined && value !== false
    } else if (attribute.type === 'number' && (!queryType.isNumber(value) || value < 0)) {
      return next(createError(406))
    } else if (attribute.type === 'string') {
      value += ''
    }

    orderedBody[attribute.name] = value
  }

  req.body = orderedBody
  return next()
}
