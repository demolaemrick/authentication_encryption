const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require('mongoose')
//for hashing and salting
const bcrypt = require('bcrypt');
const saltRounds = 10;


const app = express();
app.use(express.static('public'))
app.set('view engine', 'ejs');


mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});

let Schema = mongoose.Schema

const userSchema = new Schema ({
  email: String,
  password: String
})


const User = mongoose.model('User',  userSchema)


app.use(bodyParser.urlencoded({
  extended: true
}))

app.get('/', (req, res) => {
  res.render('home')
})

app.route('/register')
  .get((req, res) => {
    res.render('register')
  })
  .post((req,res) => {
    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    // Store hash in your password DB.
      const newUser = new User({
        email: req.body.username,
        password: hash
      })
      newUser.save((err) => {
        if(err){
          console.log(err)
        }else{
          res.render('secrets')
        }
      })
    });

  })

app.route('/login')
  .get((req, res) => {
    res.render('login')
  })
  .post((req,res) => {
    const username = req.body.username
    const password = req.body.password

    User.findOne({email: username}, (err, foundUser) => {
      if(err){

      }else{
        if(foundUser){
          bcrypt.compare(password, foundUser.password, function(err, result) {
            // result == true
            if(result == true){
              res.render('secrets')
              console.log(`${foundUser.email} has successfully logged in!`)
            }else{
              res.send('Incorrect email or password')
            }
          });
        }
      }
    })
  })

let port = 5000
app.listen(port, () => {
  console.log(`Server started on port ${port}...`)
})
