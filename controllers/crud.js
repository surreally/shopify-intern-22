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

// note: req.baseUrl is of the form '/item'

async function createItem (req, res, next) {
  if (req.method === 'GET') {
    const endpoint = req.app.get('endpoint')
    const resources = req.app.get('resources')
    const categoryUrl = req.baseUrl
    const category = categoryUrl.slice(categoryUrl.search(/\w/g))
    const attributeTypes = req.app.get('resourceAttributeTypes')

    try {
      const databases = await getDatabases(category, resources, endpoint)
      // create item in database
      res.render('edit', {
        title: 'New',
        resources,
        attributeTypes,
        category,
        databases // if any attribute is itself a database
      })
    } catch (err) {
      return next(err)
    }
  } else if (req.method === 'POST') {
    // create item in database
    const endpoint = req.app.get('endpoint')
    const categoryUrl = req.baseUrl
    axios.post(endpoint + categoryUrl,
      req.body)
      .then((reply) => { // object json
        res.redirect(categoryUrl + '/' + reply.data._id)
      })
      .catch(next)
  } else {
    return next(createError(400))
  }
}

function readItem (req, res, next) {
  // read item from database
  const endpoint = req.app.get('endpoint')
  const resources = req.app.get('resources')
  const categoryUrl = req.baseUrl
  const idUrl = req.path

  axios.get(endpoint + categoryUrl + '/' + req.params.id)
    .then((reply) => { // object json
      res.render('detail', {
        title: 'Detail',
        resources,
        categoryUrl,
        idUrl,
        // TODO: this is bad, but I'm assuming here all data from database came from
        //       this server, which was escaped
        details: unescapeInputs(reply.data)
      })
    })
    .catch(next)
}

async function updateItem (req, res, next) {
  if (req.method === 'GET') {
    // read item to update from database
    const endpoint = req.app.get('endpoint')
    const resources = req.app.get('resources')
    const categoryUrl = req.baseUrl
    const category = categoryUrl.slice(categoryUrl.search(/\w/g))
    const attributeTypes = req.app.get('resourceAttributeTypes')

    try {
      res.render('edit', {
        title: 'Edit',
        resources,
        attributeTypes,
        category,
        details: unescapeInputs(await axios.get(endpoint + categoryUrl + '/' + req.params.id)
          .then(reply => reply.data)),
        databases: await getDatabases(category, resources, endpoint)
      })
    } catch (err) {
      return next(err)
    }
  } else if (req.method === 'POST') {
    // update item in database
    const endpoint = req.app.get('endpoint')
    const categoryUrl = req.baseUrl

    axios.put(endpoint + categoryUrl + '/' + req.params.id,
      req.body)
      .then((reply) => { // empty
        res.redirect(categoryUrl + '/' + req.params.id)
      })
      .catch(next)
  } else if (req.method === 'PUT') {
    // update item in database
    const endpoint = req.app.get('endpoint')
    const categoryUrl = req.baseUrl

    axios.put(endpoint + categoryUrl + '/' + req.params.id,
      req.body)
      .then((reply) => { // empty
        res.redirect(categoryUrl + '/' + req.params.id)
      })
      .catch(next)
  } else {
    return next(createError(400))
  }
}

function deleteItem (req, res, next) {
  // delete item in database
  const endpoint = req.app.get('endpoint')
  const categoryUrl = req.baseUrl

  axios.delete(endpoint + categoryUrl + '/' + req.params.id)
    .then((reply) => { // empty
      res.redirect(categoryUrl)
    })
    .catch(next)
}

function listItems (req, res, next) {
  const endpoint = req.app.get('endpoint')
  const resources = req.app.get('resources')
  const categoryUrl = req.baseUrl
  const category = categoryUrl.slice(categoryUrl.search(/\w/g))
  const detailLevel = req.app.get('resourceListDetailLevel')

  // read items from database
  axios.get(endpoint + categoryUrl)
    .then((reply) => { // array of json objects
      res.render('list', {
        title: 'List',
        resources,
        detailLevel,
        category,
        inventory: reply.data.map(details => unescapeInputs(details))
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
  const unescaped = Object.entries(req.body)
  const escaped = {}

  // TODO: figure out hwo to move these functions out
  unescaped.forEach(function escapeProperty (property) {
    const [key, value] = property.map(function escapeField (field) {
      // for now, coerce every key and value into a string
      field = validator.trim(field + '')
      // zero length is ok
      field = validator.escape(field)
      return field
    })

    escaped[key] = value
  })

  req.body = escaped
  return next()
}

// enforce resource attribute order and types for POST and PUT inputs
function sanitizeAttributeTypes (req, res, next) {
  // queryType parses '' as null, and ignores all null values (deletes property)
  const typedBody = queryType.parseObject(req.body)
  const resources = req.app.get('resources')
  const category = req.baseUrl.slice(req.baseUrl.search(/\w/g))
  const resource = resources.find(resource => resource.category === category)
  const attributes = resource.attributes
  const orderedBody = {}

  for (const attribute of attributes) {
    let value = typedBody[attribute.name]

    if (value === undefined && attribute.type !== 'boolean' && attribute.type !== 'database') {
      return next(createError(406))
    } else if (attribute.type === 'database') {
      // ASSUME: value is either undefined or valid ID
      // TODO: check ID?
    } else if (attribute.type === 'boolean') {
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

// utilities

// TODO: refactor
async function getDatabases (category, resources, endpoint) {
  const resource = resources.find(resource => resource.category === category)
  const attributes = resource.attributes
  const databases = {}

  for (const { name, type } of attributes) {
    if (type !== 'database') continue
    // attribute's type is database

    // get database
    const databaseEndpoint = endpoint + '/' + name
    const reply = await axios.get(databaseEndpoint) // list inventory of database, e.g. warehouse
    const inventory = reply.data

    // determine the one display attribute besides id: at most two levels of detail
    /* tentative strategy for finding display attribute: first one whose type is string
        * - matches 'name', 'location', etc. attributes
        * - downside: will match 'description', 'summary', etc. too -- long -> unsuitable
        *   - short, identifiable attributes should be defined early in configuration
        */
    const dbResource = resources.find(resource => resource.category === name)
    const displayAttribute = dbResource.attributes.find(attr => attr.type === 'string')

    // get options to display
    const display = []
    for (const details of inventory) {
      const option = {}
      option._id = details._id
      if (displayAttribute !== undefined) {
        option.display = details[displayAttribute.name]
      }
      display.push(unescapeInputs(option))
    }

    databases[name] = display
  }
  return databases
}

// unescape all names and values in an un-nested object for display
function unescapeInputs (body) {
  const escaped = Object.entries(body)
  const unescaped = {}

  escaped.forEach(function unescapeProperty (property) {
    const [key, value] = property.map(function unescapeField (field) {
      // for now, coerce every key and value into a string
      field = validator.trim(field + '')
      // zero length is ok
      field = validator.unescape(field)
      return field
    })

    unescaped[key] = value
  })

  return unescaped
}
