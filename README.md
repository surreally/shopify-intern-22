**shopify-intern-22**
For Shopify's backend Fall'22 intern challenge

# Inventories app

A 'Create, Read, Update & Delete' (CRUD) interface for keeping a simple
inventory.

- Supports HTTP/1.1 (no HTTPS)
- Configurable with `/conf/conf.json`:
  - 'Database' location
  - Items, warehouses, any other category of resources
    - Define resource specifications with `"attributes"`, such as name, quantity and location
  - Resource attribute types, such as string, number and boolean
    - More can be easily defined
    - Possible to use other tools for this purpose, e.g. [JSON Schema](https://json-schema.org/) (I did not know about Schema when I was developing this project)
  - Resource list detail level (see Usage > List section)
- Built with Express.js, Node.js, Bootstrap
- 'Database' supported by [crudcrud.com](https://crudcrud.com)
  - See inventory [here](https://crudcrud.com/Dashboard/101d426af05b43bd93aff1748c721856)
    - Current CrudCrud endpoint will expire in late June, 2022. But switching instances can be easily done in configuration file
  - See 'Database' section

## Deploy

Deployed on Repl.it at https://replit.com/@toripi/shopify-intern-22

## Usage

Use it in the browser or on the command line by sending http requests, e.g. with [httpie](https://httpie.io/)

As an example, if the desired resource is `item`:
- Create
  - `GET /item/new` renders page to create an item
  - `POST /item/new ...` directly sends a request to create an item
- Read
  - `GET /item/${id}` renders page with details of the item whose ID is `id` ("the item")
- Update
  - `GET /item/${id}/edit` renders page to update the item, prefilled with current details of the item
    - This page displays a form, therefore it sends a `POST /item/${id}/edit ...` request to update the item, which is handled by the server
  - `PUT /item/${id}` directly sends a request to update the item
- Delete
  - `POST /item/${id}/delete` sends a request to delete the item
    - This is reached from the item detail page in the browser
  - `DELETE /item/${id}` directly sends a request to delete the item
- List (read all)
  - `GET /item` renders page to list all items with excerpted details
    - Currently, it's limited to 3 details, including item ID's

## 'Database'
The app makes calls to the CRUD API at [crudcrud.com](https://crudcrud.com) to simulate database operations.

The advantage is CrudCrud's data is very accessible. Verifying the correctness of the app becomes very easy.

The downsides are:
- Warehouse assignment can be done, but when database is set up so that item has information about its warehouse but not the other way around, pulling information becomes very tough. Ideally a warehouse's detail page will include a list of items assigned there. This is not implemented in this app.
  - Regret: if the app was developed with MongoDB, for example, this would not be a problem as MongoDB (`mongoose`) can populate a field representing another database very easily.
- This app becomes somewhat redundant since it's also just a naive CRUD.
