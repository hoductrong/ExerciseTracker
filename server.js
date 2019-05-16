const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
const Schema = mongoose.Schema;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true } )


var UserSchema = new Schema({
  username: String
});

var ExerciseSchema = new Schema({
  userId: String,
  description: String,
  duration: Number,
  date: Date
});

var User = mongoose.model('User', UserSchema);
var Exercise = mongoose.model('Exercise', ExerciseSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Not found middleware
// app.use((req, res, next) => {
//   return next({status: 404, message: 'not found'})
// })

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

app.get('/api/exercise/users', function(req, res) {
  User.find().exec((error, data) => {
    if(error) console.log('Error findall: ' + error);
    res.json(data);
  });
});

app.get('/api/exercise/log', function(req, res) {
  console.log(mongoose.connection.readyState);
  let {userId, from, to, limit} = req.query;
  let resData = {userId, from, to};
  if(userId === null) res.send('Unknown userId');
  User.findOne({_id: userId}, (error, userData) => {
    if(error) res.send(error);
    if(!userData) res.send('Unknown userId');
    resData.username = userData.username;
    Exercise.find(
      {
        userId : userId, 
        date: { $lte: to || '2900-01-01', $gte: from || '1900-01-01'}
      },{ _id: 0 }).limit(parseInt(limit) || 0).exec((error, data) => {
      if(error) {
        res.send(error);
        console.log(error);
      }
      if(data){
        resData.count = data.length;
        resData.log = data;
        res.json(resData);
      }
      else{
        resData.count = 0;
        resData.log = [];
        res.json(resData);
      }
    });
  });
  
});


app.post('/api/exercise/new-user', function(req, res) {
  console.log(mongoose.connection.readyState);
  console.log('username: ' + req.body.username);
  let username = req.body.username;
  let newUser = new User({username: username});
  User.findOne({username: username}, (error, data) => {
    if(error) console.log('Error find: ' + error);
    if(data) {
      res.send('This name has already taken. ID: ' + data._id);
    }
    else{
      newUser.save((error, data) => {
        if(error) console.log('Error create: ' + error);
        res.json(data);
      });
    }
  });
});

app.post('/api/exercise/add', function(req, res) {
  let { userId, description, duration, date } = req.body;
  let newExercise = new Exercise({ userId: userId, description: description, duration: duration, date: Date.parse(date) || new Date() });
  newExercise.save((error, data) => {
    if(error) res.json(error);
    res.json(data);
  });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  
  console.log('Your app is listening on port ' + listener.address().port)
})
