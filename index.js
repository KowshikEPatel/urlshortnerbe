require('dotenv').config()
const express  =  require("express")
const mongodb = require('mongodb')
const bcrypt = require('bcrypt')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const randomstring = require('randomstring')
const nodemailer = require('nodemailer')


const mongoclient = mongodb.MongoClient;
const objectid = mongodb.ObjectID
const port = process.env.PORT
const app = express()
app.use(express.json())
app.use(cors())
const dbURL = process.env.DB_URL


app.get('/',async (req,res)=>{
    const client = await mongoclient.connect(dbURL, {useNewUrlParser: true, useUnifiedTopology: true})
            let db = client.db('projecturlshort')
            let user = await db.collection('user').findOne()
            let data = await db.collection("url").findOneAndUpdate({"createdBy":""},{$set:{"createdBy":user._id}})
    res.status(200).json(data)
})

app.get('/useractivate/:id', async (req,res)=>{
  
      const client = await mongoclient.connect(dbURL, {useNewUrlParser: true, useUnifiedTopology: true})
      let db = client.db('projecturlshort')
      let user = await db.collection('user').findOneAndUpdate({"_id":objectid(req.params.id)},{$set:{'isActive':true}})
      res.redirect('https://friendly-feynman-57301c.netlify.app/useractivated') 
})

app.post("/newuser",async (req,res)=>{
    
    bcrypt.genSalt(11,(err,salt)=>{
        bcrypt.hash(req.body["password"],salt, async (err,hash)=>{
            
            const client = await mongoclient.connect(dbURL, {useNewUrlParser: true, useUnifiedTopology: true})
            let db = client.db('projecturlshort')
            let data = await db.collection("user").insertOne({
                "username":req.body["username"],
                "firstName":req.body['firstname'],
                "lastName":req.body['lastname'],
                "password":hash,
                "isActive":false,
                "passwordReset":{
                    "hasRequestedReset":false,
                    "randomString":""
                                },
            })
            
            let transporter = nodemailer.createTransport({
              host: "smtp.ethereal.email",
              port: 587,
              secure: false, // true for 465, false for other ports
              auth: {
                        user: process.env.EMAIL, // generated ethereal user
                        pass: process.env.PASSWORD, // generated ethereal password
                    },
            });
            
            let info = await transporter.sendMail({
              from: process.env.EMAIL, // sender address
              to: data['ops'][0]['username'], // list of receivers
              subject: "Hello ✔", // Subject line
              text: "Hello world?", // plain text body
              html: `<b>Click on the following button to activate your account</b><a href = 'https://kp-microurl.herokuapp.com/useractivate/${data['ops'][0]['_id']}'><button>Activate account</button></a>`, // html body
            });
          
            
            res.status(200).json({data,"message":info.messageId})
            client.close()
        })
    })
    
})

app.post('/forgotpw', async (req,res)=>{
    const client = await mongoclient.connect(dbURL, {useNewUrlParser: true, useUnifiedTopology: true})
    let db = client.db('projecturlshort')
    let data = await db.collection("user").findOne(req.body)
    console.log(data)
    let transporter = nodemailer.createTransport({ 
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
              user: process.env.EMAIL, // generated ethereal user
              pass: process.env.PASSWORD, // generated ethereal password
            },
        });
    let key = randomstring.generate()
    console.log(req.body)
    let randomURL = `https://friendly-feynman-57301c.netlify.app/resetpassword/`+key
    let stored  = await db.collection('user').findOneAndUpdate(req.body,{$set:{"passwordReset":{"hasRequestedReset":true, "randomString":key}}})
    console.log(stored)
    let info = await transporter.sendMail({
        from: '"felicia24@ethereal.email" <felicia24@ethereal.email>', 
        to:  data["username"], 
        subject: "Password reset string", // Subject line
        html: `<p>Hi ${data["firstName"]}, you have requested for resetting your password on onlogger.com. Click on the 
                <a href="${randomURL}">link</a> to reset your password </p> `, // html body
    });
    res.status(200).json({info,stored,key})

})

app.post("/resetpassword/:str",async(req,res)=>{

  const client = await mongoclient.connect(dbURL, {useNewUrlParser: true, useUnifiedTopology: true})
  let db = client.db('projecturlshort')
  
  bcrypt.genSalt(11,(err,salt)=>{
      if(err){
        console.log(err)
      }
      bcrypt.hash(req.body["password"],salt, async (err,hash)=>{

          let user = await db.collection("user").findOneAndUpdate({"passwordReset":{"hasRequestedReset":true,"randomString":req.params.str}},{$set:{"password":hash}})
          res.status(200).json({"str":req.params.str,"user":user})
      })})
  client.close()
  

})


app.listen(port,()=>{console.log("server started at port " + port)})

