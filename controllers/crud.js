const crudcrud = 'https://crudcrud.com/api'
const inventoryInstance = '6bf79a5603cc4762b1e379be94b0bb3e'
const endpoint = crudcrud + '/' + inventoryInstance
// dev
const unicornsInstance = '64e6d4873cd04584bcb10aa5d8e3189c'
const toyEndpoint = crudcrud + '/' + unicornsInstance

exports.create = createItem

exports.read = readItem

exports.update = updateItem

exports.delete = deleteItem

exports.list = listItems

module.exports = exports

function createItem (req, res, next) {
  res.send('Not implemented: create')
}

function readItem (req, res, next) {
  res.send('Not implemented: read ' + req.params.id)
}

function updateItem (req, res, next) {
  res.send('Not implemented: update')
}

function deleteItem (req, res, next) {
  res.send('Not implemented: delete')
}

function listItems (req, res, next) {
  res.send('Not implemented: list')
}
