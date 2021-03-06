const createError = require('http-errors')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const conf = require('./conf/conf.json')
const database = conf.database

const indexRouter = require('./routes/index')
const resourceRouter = require('./routes/resources')

const app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

// database setup
app.set('endpoint', app.get('env') === 'development'
  ? database.crudcrud + '/' + database.dev
  : database.crudcrud + '/' + database.prod)

// resources setup
app.set('resources', conf.resources)
app.set('resourceAttributeTypes', conf.resourceAttributeTypes)
app.set('resourceListDetailLevel', conf.resourceListDetailLevel)

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

// resource api
app.use(resourceRouter)

app.use('/', indexRouter)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error', {
    title: 'Error',
    resources: req.app.get('resources')
  })
})

module.exports = exports = app
