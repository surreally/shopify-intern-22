const axios = require('axios')
const createError = require('http-errors')
const queryType = require('query-types')
const validator = require('validator')
const _ = require('underscore')

exports.create = createItemPOST

exports.createGET = createItemGET

exports.read = readItem

exports.update = updateItemPOSTPUT

exports.updateGET = updateItemGET

exports.delete = deleteItem

exports.list = listItems

exports.error = handleError

exports.escape = escapeReqBodyInputs

exports.sanitize = sanitizeAttributeTypes

exports.checkID = checkID

exports.stripQuery = stripQueryString

module.exports = exports

/* implementations */

async function createItemPOST (req, res, next) {
  const endpoint = req.app.get('endpoint')
  const categoryUrl = req.baseUrl

  try { // create item in database
    const id = await axios.post(endpoint + categoryUrl,
      req.body)
      .then(res => res.data._id)

    return res.redirect(categoryUrl + '/' + id)
  } catch (err) {
    return next(err)
  }
}

async function createItemGET (req, res, next) {
  const endpoint = req.app.get('endpoint')
  const categoryUrl = req.baseUrl
  const resources = req.app.get('resources')
  const category = categoryUrl.slice(categoryUrl.search(/\w/g))
  const attributeTypes = req.app.get('resourceAttributeTypes')
  const resource = resources.find(resource => resource.category === category)
  const attributes = resource.attributes

  try { // populate database attributes
    const databases = await getDatabases(attributes, resources, endpoint)

    return res.render('edit', {
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

  try { // read item from database
    const details = await axios.get(endpoint + categoryUrl + idUrl)
      .then(res => {
        const forceEscapedInputs = escapeInputs(res.data) // trust no one
        return unescapeInputs(forceEscapedInputs)
      }) // queryType parsing optional

    return res.render('detail', {
      title: 'Detail',
      resources,
      categoryUrl,
      idUrl,
      details
    })
  } catch (err) {
    return next(err)
  }
}

async function updateItemPOSTPUT (req, res, next) {
  const endpoint = req.app.get('endpoint')
  const categoryUrl = req.baseUrl
  const idUrl = '/' + req.params.id

  try { // update item in database
    await axios.put(endpoint + categoryUrl + idUrl,
      req.body)
    return res.redirect(categoryUrl + idUrl)
  } catch (err) {
    return next(err)
  }
}

async function updateItemGET (req, res, next) {
  const endpoint = req.app.get('endpoint')
  const categoryUrl = req.baseUrl
  const idUrl = '/' + req.params.id
  const resources = req.app.get('resources')
  const category = categoryUrl.slice(categoryUrl.search(/\w/g))
  const attributeTypes = req.app.get('resourceAttributeTypes')
  const resource = resources.find(resource => resource.category === category)
  const attributes = resource.attributes
  // create two I/O promises
  const detailsReq = axios.get(endpoint + categoryUrl + idUrl)
    .then(res => res.data)
  const databasesReq = getDatabases(attributes, resources, endpoint)

  try { // read item to update from database and populate database attributes
    const results = await Promise.all([detailsReq, databasesReq])
    const details = queryType.parseObject(unescapeInputs(results[0]))
    const databases = results[1]

    return res.render('edit', {
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

  try { // delete item in database
    // return axios.delete(endpoint + categoryUrl + idUrl)
    //   .then(res.redirect(categoryUrl)) // this is faster but possibly inaccurate
    await axios.delete(endpoint + categoryUrl + idUrl)
    return res.redirect(categoryUrl) // this is slower (depending on database) but accurate
  } catch (err) {
    return next(err)
  }
}

async function listItems (req, res, next) {
  const endpoint = req.app.get('endpoint')
  const resources = req.app.get('resources')
  const categoryUrl = req.baseUrl
  const category = categoryUrl.slice(categoryUrl.search(/\w/g))
  const detailLevel = req.app.get('resourceListDetailLevel')

  try { // read items from database
    const inventory = await axios.get(endpoint + categoryUrl)
      .then(res => res.data.map(details => {
        const forceEscapedInputs = escapeInputs(details)
        return unescapeInputs(forceEscapedInputs)
      })) // queryType parsing optional

    return res.render('list', {
      title: 'List',
      resources,
      detailLevel,
      category,
      inventory
    })
  } catch (err) {
    return next(err)
  }
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
function escapeReqBodyInputs (req, res, next) {
  req.body = escapeInputs(req.body)
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
      // if ID doesn't exist, database returns 404
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

// naive for now
function checkID (req, res, next) {
  if (!validator.isAlphanumeric(req.params.id)) return next(createError(406))
  return next()
}

function stripQueryString (req, res, next) {
  req.query = {}
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
  // error uncaught: sent back to caller (updateItem)

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
          ])) // relabel the display attribute name as 'display' for view to render
      .map(details =>
        Object.fromEntries(details))
      .map(details =>
        unescapeInputs(details))) // escape both key and value
  const labeledDisplays = _.zip(dbCategories, displays)
  // then to produce the final display by combining with labels
  const display = Object.fromEntries(labeledDisplays)
  return display
}

// escape all names and values in an un-nested object
function escapeInputs (body) {
  const unescapedEntries = Object.entries(body)
  const escapedEntries = unescapedEntries.map(escapeProperty)
  const escapedBody = Object.fromEntries(escapedEntries)

  return escapedBody
}

function escapeProperty (property) {
  if (property.length !== 2) throw createError(406)
  return property.map(escapeField)
}

function escapeField (field) {
  const trimmed = trimField(field)
  // zero length is ok
  return validator.escape(validator.unescape(trimmed)) // force escape
}

// unescape all names and values in an un-nested object for display
function unescapeInputs (body) {
  const escapedEntries = Object.entries(body)
  const unescapedEntries = escapedEntries.map(unescapeProperty)
  const unescapedBody = Object.fromEntries(unescapedEntries)

  return unescapedBody
}

function unescapeProperty (property) {
  if (property.length !== 2) throw createError(406)
  return property.map(unescapeField)
}

function unescapeField (field) {
  const trimmed = trimField(field)
  // zero length is ok
  return validator.unescape(trimmed)
}

function trimField (field) {
  // for now, coerce every key and value into a string
  return validator.trim(field + '')
}
