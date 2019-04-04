const db = require('./db')
// const db_raw = require('./db-raw')

// env params with default value
const YOUTUBE_VIDEO_ID = process.env.YOUTUBE_VIDEO_ID || 'wUPPkSANpyo'
const EVENT_TOKEN = process.env.EVENT_TOKEN || 'YEEEEEEEEEEEEEEEEEEE'
// packages
const path = require('path')
const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
require(path.join(__dirname, '/common'))

const { handleProgress, statusCodeSheet } = require('./handleProgress')({io, log, db})

app.use(express.static(path.join(BASE_DIR, '/public')))
app.use(express.static(path.join(BASE_DIR, '/assets')))

// setup view engine
app.set('view engine', 'pug')
app.set('views', path.join(BASE_DIR, '/views'))

let user_live_count = 0
// user live counter
io.on('connection', function(socket){
  // log('an user connect', socket.id)
  // update user counter
  user_live_count++
  socket.on('disconnect', (reason) => {
    user_live_count--
  })

  // recieve scanner server messages
  socket.on(EVENT_TOKEN, data =>{
    handleProgress(data)
  })
})

function updateUserCounter () {
  io.emit('uuc', user_live_count)
}

// update to client every 5 seconds
setInterval(updateUserCounter, 1000 * 5)

// setup index route
app.get('/', function (req, res) {
  res.render('index', {
    counter: db.get('counter').value(),
    startedAt: db.get('matches[0].created_at').value(),
    history: db.get('matches').takeRight(5).value(),
    user_live_count,
    YOUTUBE_VIDEO_ID
  })
})

const getDate = d =>{
  return moment(d, ["YYYY年MM月DD日 hh:mm:ss"])
}

var chartdata = {

}
app.get('/chartdata', function (req, res) {
  // if (getDate(chartdata.now)) {
  //   return res.json(chartdata)
  // }
  // let keywords = Object.keys(db.get('counter').value())
  let ranges = 6
  // filter out of range data
  let matches = db.get('matches').value().filter(m => {
    let a = getDate(m.created_at)
    let b = moment().subtract(ranges, 'hour').startOf('hour')
    return a > b
  })
  let x = []
  let data = []
  // counter
  for (let i = 0; i <= ranges; i++){
    let a = moment().subtract(ranges - i, 'hour').startOf('hour')
    let b = moment().subtract(ranges - i -1, 'hour').startOf('hour')
    data[i] = 0

    matches.forEach(m =>{
      let t = getDate(m.created_at)
      log('t', t.format('lll'), 'is between?', a.format('lll'), b.format('lll'), t.isBetween(a,b))
      if (t.isBetween(a,b)) {
        data[i]++
      }
    })

    x.unshift(b.format('LT'))
  }

  let now = moment().format('lll')

  chartdata = {
    data,
    x,
    now
  }
  res.json(chartdata)
})

app.get('/keywords', (req, res) => {
  res.render('_keywords', {
    counter: db.get('counter').value()
  })
})

app.get('/codesheet', function (req, res) {
  res.json(statusCodeSheet.map(s =>{
    return {
      c: s.code,
      t: s.text
    }
  }))
})

// db download route
// app.get('/dbdownload', (req, res) =>{
//   res.download(DB_PATH)
// })


// start app
const PORT = process.env.PORT || 3000
http.listen(PORT, function () {
  log(`App serving on http://localhost:${PORT}!`)
})