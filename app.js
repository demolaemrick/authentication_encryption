require('dotenv').config()

const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require('mongoose')
const encrypt = require('mongoose-encryption');

const app = express();
app.use(express.static('public'))
app.set('view engine', 'ejs');


mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});

let Schema = mongoose.Schema

const userSchema = new Schema ({
  email: String,
  password: String
})

let secret = process.env.SECRET;
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });

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
    const newUser = new User({
      email: req.body.username,
      password: req.body.password
    })
    newUser.save((err) => {
      if(err){
        console.log(err)
      }else{
        res.render('secrets')
      }
    })
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
          if(password === foundUser.password){
            res.render('secrets')
            console.log(`${foundUser.email} has successfully logged in!`)
          }else{
            res.send('Incorrect email or password')
          }
        }else{
          res.send('Incorrect email or password')
        }
      }
    })
  })

let port = 5000
app.listen(port, () => {
  console.log(`Server running on ${port}...`)
})
