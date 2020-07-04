require('dotenv').config() //for env file to load up

const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require('mongoose')
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
//for google OAuth
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
// dor facebook OAuth
const FacebookStrategy = require('passport-facebook').Strategy;



const app = express();
app.use(express.static('public'))
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }))
//session config
app.use(session({
  secret: 'My little secret.',
  resave: false,
  saveUninitialized: false,
  // cookie: { secure: true }
}))
//passport config
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-ademola:test123@cluster0.kcwsn.mongodb.net/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true)

let Schema = mongoose.Schema

const userSchema = new Schema ({
  username: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
})
//because I'm using a package to enable findOrCreate which is not a mongoose query
userSchema.plugin(findOrCreate);
//using passportLocalMongoose to hashing and salting
userSchema.plugin(passportLocalMongoose)

const User = mongoose.model('User',  userSchema)

// to create a local login strategy
passport.use(User.createStrategy());

// this enables you to create a strategy for all kin d of auth not just local authentication alone
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//////////////////////////////////// Google OAuth ///////////////////////////////////////////////
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:5000/auth/google/secrets",
    // userProfileUrl: "https://www.googlapis.com/oauth2/v3/userinfo"
  },

function(accessToken, refreshToken, profile, cb) {

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
//////////////////////////////////// Google OAuth ///////////////////////////////////////////////

passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:5000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.use(bodyParser.urlencoded({
  extended: true
}))

app.get('/', (req, res) => {
  res.render('home')
})

//////////////////////////////////// google OAuth request ///////////////////////////////////////////////

app.get('/auth/google', passport.authenticate('google', { scope: ["profile"] }));

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


//////////////////////////////////// facebook OAuth request ///////////////////////////////////////////////
app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get('/secrets', (req, res) => {
  User.find({'secret': {$ne: null}}, (err, foundUser) => {
    if(err){
      console.log(err)
    }
    else {
      if(foundUser){
        res.render('secrets', {usersWithSecrets: foundUser})
      }
    }
  })
})

app.route('/submit')
  .get((req, res) => {
    if (req.isAuthenticated()){
      res.render("submit")
    } else{
      res.redirect('/login')
    }
  })
  .post((req, res) => {
    const submittedSecret = req.body.secret
    // Note: whenever you login some of the info cached be session is info about the user
    // req.user has the info about the user who logged in and req.user.id is the user id
    User.findById(req.user.id, (err, foundUser) => {
      if(foundUser){
        foundUser.secret = submittedSecret
        foundUser.save(() => {
          res.redirect("/secrets")
        })
      }else if(err){
        console.log(err)
      }
    })
  })
app.route('/register')
  .get((req, res) => {
    res.render('register')
  })
  .post((req,res) => {

    // Note: I'm able to use .register because a plugin has been added to my Shema above.
    User.register({username: req.body.username}, req.body.password, (err, regUser) => {
      if(err){
        console.log(err)
        res.redirect('/register')
      }else{
        // using passport to authenticate user whenever they register
        passport.authenticate("local")(req, res, (err, result) => {
          // Value of 'result' is set to false. The user could not be authenticated since the user is not active
          res.redirect('/secrets')
       })
      }
    })
  })

app.route('/login')
  .get((req, res) => {
    res.render('login')
  })
  .post((req,res) => {
    const user = new User({
      username: req.body.username,
      password: req.body.password
    })
    req.login(user, function(err) {
      if(err){console.log(err)}
      else {
        // using passport to authenticate user
        passport.authenticate("local")(req, res, (err, result) => {
          // Value of 'result' is set to false. The user could not be authenticated since the user is not active
          res.redirect('/secrets')
       })
      }
    });
  })

app.get('/logout', (req, res) => {
  req.logout()
  res.redirect('/')
})

let port = process.env.PORT;
if(port == null || port == "") {
  port = 5000
}
app.listen(port, () => {
  console.log(`Server started on port ${port}...`)
})
