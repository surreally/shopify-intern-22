const axios = require('axios')
const createError = require('http-errors')
const queryType = require('query-types')
const validator = require('validator')
const _ = require('underscore')

exports.create = createItem

exports.read = readItem

exports.update = updateItem

exports.delete = deleteItem

exports.list = listItems

exports.error = handleError

exports.escape = escapeInputs

exports.sanitize = sanitizeAttributeTypes

module.exports = exports

/* implementations */

async function createItem (req, res, next) {
  const endpoint = req.app.get('endpoint')
  const categoryUrl = req.baseUrl

  if (req.method === 'POST') {
    // create item in database
    const id = await axios.post(endpoint + categoryUrl,
      req.body)
      .then(res => res.data._id)
      .catch(next)

    res.redirect(categoryUrl + '/' + id)
  } else if (req.method !== 'GET') {
    return next(createError(400))
  }

  const resources = req.app.get('resources')
  const category = categoryUrl.slice(categoryUrl.search(/\w/g))
  const attributeTypes = req.app.get('resourceAttributeTypes')
  const resource = resources.find(resource => resource.category === category)
  const attributes = resource.attributes

  try {
    const databases = await getDatabases(attributes, resources, endpoint)

    res.render('edit', {
      title: 'New',
      resources,
      attributeTypes,
      category,
      databases // if any
    })
  } catch (err) {
    return next(err)
  }
}

async function readItem (req, res, next) {
  const endpoint = req.app.get('endpoint')
  const resources = req.app.get('resources')
  const categoryUrl = req.baseUrl
  const idUrl = '/' + req.params.id

  // read item from database
  const details = await axios.get(endpoint + categoryUrl + idUrl)
    .then(res => unescapeInputs(res.data))
    .catch(next)
  // TODO: this is bad, but I'm assuming here all data from database came from
  //       this server, which was escaped, so unescaping it all is ok

  res.render('detail', {
    title: 'Detail',
    resources,
    categoryUrl,
    idUrl,
    details
  })
}

async function updateItem (req, res, next) {
  const endpoint = req.app.get('endpoint')
  const categoryUrl = req.baseUrl
  const idUrl = '/' + req.params.id

  if (req.method === 'POST' || req.method === 'PUT') {
    // update item in database
    axios.put(endpoint + categoryUrl + idUrl,
      req.body)
      .then(res.redirect(categoryUrl + idUrl))
      .catch(next)
  } else if (req.method !== 'GET') {
    return next(createError(400))
  }

  const resources = req.app.get('resources')
  const category = categoryUrl.slice(categoryUrl.search(/\w/g))
  const attributeTypes = req.app.get('resourceAttributeTypes')
  const resource = resources.find(resource => resource.category === category)
  const attributes = resource.attributes

  try {
    // read item to update from database
    const details = await axios.get(endpoint + categoryUrl + idUrl)
      .then(res => unescapeInputs(res.data))
      .catch(next)
    const databases = await getDatabases(attributes, resources, endpoint)
    // // debug
    // console.log(databases)
    // return next(createError(501))

    res.render('edit', {
      title: 'Edit',
      resources,
      attributeTypes,
      category,
      details,
      databases
    })
  } catch (err) {
    return next(err)
  }
}

async function deleteItem (req, res, next) {
  const endpoint = req.app.get('endpoint')
  const categoryUrl = req.baseUrl
  const idUrl = '/' + req.params.id

  // delete item in database
  await axios.delete(endpoint + categoryUrl + idUrl)
    .then(res.redirect(categoryUrl))
    .catch(next)
}

async function listItems (req, res, next) {
  const endpoint = req.app.get('endpoint')
  const resources = req.app.get('resources')
  const categoryUrl = req.baseUrl
  const category = categoryUrl.slice(categoryUrl.search(/\w/g))
  const detailLevel = req.app.get('resourceListDetailLevel')

  // read items from database
  const inventory = await axios.get(endpoint + categoryUrl)
    .then(res => res.data.map(details => unescapeInputs(details)))
    .catch(next)

  res.render('list', {
    title: 'List',
    resources,
    detailLevel,
    category,
    inventory
  })
}

function handleError (error, req, res, next) {
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
  const categoryUrl = req.baseUrl
  const category = categoryUrl.slice(categoryUrl.search(/\w/g))
  const resource = resources.find(resource => resource.category === category)
  const attributes = resource.attributes
  const orderedBody = {}

  for (const attribute of attributes) {
    let value = typedBody[attribute.name]

    if (value === undefined && attribute.type !== 'boolean' && attribute.type !== 'database') {
      return next(createError(406))
    } else if (attribute.type === 'database') {
      // ASSUME: value is either undefined or valid ID, or (horrible) escaped string
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

/* utilities */

// for a given resource, return ('populate') its database attributes
async function getDatabases (attributes, resources, endpoint) {
  const dbAttributes = attributes.filter(attr =>
    attr.type === 'database')
  const dbCategories = dbAttributes.map(attr =>
    attr.name)
  const dbRequests = dbCategories.map(category =>
    axios.get(endpoint + '/' + category)
      .then(res => res.data))

  // I/O: send a 'list' (read all) request to database
  const inventories = await Promise.all(dbRequests)

  const dbResources = dbCategories.map(category =>
    resources.find(resource =>
      resource.category === category))
  const dbDisplayAttributes = dbResources.map(resource =>
    resource.attributes.find(attr =>
      attr.type === 'string'))
  const dbDisplayAttrNames = dbDisplayAttributes.map(attr =>
    attr.name)
  // if number of display attributes changes, this method is extensible;
  // but there's only one thing to display, I don't know why I did this
  const labelsArray = dbDisplayAttrNames.map(name =>
    ['_id', name])
  const labeledInventories = _.zip(inventories, labelsArray)
  // the idea is to transform
  //   'inventories': with all attributes for every resource (as database)
  // into
  //   'displays': with only the ID and the other display attribute value
  // with the attribute names to select, one per inventory/kind of resource
  const displays = labeledInventories.map(([inventory, labels]) =>
    inventory
      .map(details =>
        Object.entries(details))
      .map(details =>
        details.filter(detail => // select the required attributes only
          labels.includes(detail[0])))
      .map(details =>
        details.map(detail =>
          [
            detail[0] === '_id'
              ? '_id'
              : 'display',
            detail[1]
          ])) // relabel the display attribute name for view to render
      .map(details =>
        Object.fromEntries(details))
      .map(details =>
        unescapeInputs(details))) // escape both key and value
  const labeledDisplays = _.zip(dbCategories, displays)
  // then to produce the final display by combining with labels
  const display = Object.fromEntries(labeledDisplays)
  return display
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
