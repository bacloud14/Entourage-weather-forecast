// import { weatherMap } from "./routes"

const dotenv = require('dotenv')
dotenv.config()
console.log(`Your port is ${process.env.PORT}`) // 8626
const express = require('express')
const helmet = require('helmet')
const favicon = require('serve-favicon')
const path = require('path')
const app = express()
const Sentry = require('@sentry/node')
const Tracing = require('@sentry/tracing')

if (process.env.NODE_ENV !== 'dev') {
  Sentry.init({
    dsn: `https://${process.env.SENTRY_KEY}.ingest.sentry.io/1871185`,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app })
    ],
    tracesSampleRate: 1.0
  })
}
app.use(Sentry.Handlers.requestHandler())
app.use(Sentry.Handlers.tracingHandler())
app.use(favicon(path.join(__dirname, '/public/img', 'icon.png')))
app.use(helmet({ contentSecurityPolicy: false }))
app.set('view engine', 'ejs')
const rateLimit = require('express-rate-limit')
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
app.use(limiter)
const nodePort = process.env.PORT

app.listen(nodePort, () => {
  console.log(`Server running on port ${nodePort}`)
})
app.use(express.static(__dirname + '/'))
app.use(express.static(__dirname + '/public/', {
  etag: true, // Just being explicit about the default.
  lastModified: true, // Just being explicit about the default.
  setHeaders: (res, path) => {
    const hashRegExp = new RegExp('\\.[0-9a-f]{8}\\.')

    if (path.endsWith('.html')) {
      // All of the project's HTML files end in .html
      res.setHeader('Cache-Control', 'no-cache')
    } else if (hashRegExp.test(path)) {
      // If the RegExp matched, then we have a versioned URL.
      res.setHeader('Cache-Control', 'max-age=31536000')
    }
  }
}))

let pass = ''
if (process.env.NODE_ENV === 'dev') {
  pass = process.env.PASS
}
app.use(`/${pass}`, require('./api/routes_api'))
app.use(`/${pass}`, require('./api/routes_ui'))

const dns = require('dns')
app.use(function (req, res, next) {
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  if (ip.substr(0, 7) === '::ffff:') {
    ip = ip.substr(7)
  }

  if (process.env.NODE_ENV === 'dev' || ip.split('.')[0] === '127') { return next() }
  const reversedIp = ip.split('.').reverse().join('.')
  dns.resolve4([process.env.HONEYPOT_KEY, reversedIp, 'dnsbl.httpbl.org'].join('.'), function (err, addresses) {
    if (!addresses) { return next() }
    const _response = addresses.toString().split('.').map(Number)
    const test = (_response[0] === 127 && _response[3] > 0) // visitor_type[_response[3]]
    if (test) { res.send({ msg: 'we hate spam to begin with!' }) }
    return next()
  })
})

app.use(function ( req,res,next ){ 
	res.status(404); 
	res.render("404", {key : process.env.OPENWEATHERMAP_API_KEY, pass : pass });
})
module.exports = app
