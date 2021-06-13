require('dotenv').config()
const express  =  require("express")
const mongodb = require('mongodb')
const bcrypt = require('bcrypt')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const randomstring = require('randomstring')
const sgMail = require('@sendgrid/mail')

const mongoclient = mongodb.MongoClient;
const objectid = mongodb.ObjectID
const port = process.env.PORT
const app = express()
app.use(express.json())
app.use(cors())
const dbURL = process.env.DB_URL
const sendGridApi = process.env.SENDGRID_API_KEY
sgMail.setApiKey(sendGridApi)


app.get('/',async (req,res)=>{
    const client = await mongoclient.connect(dbURL, {useNewUrlParser: true, useUnifiedTopology: true})
            let db = client.db('projecturlshort')
            let user = await db.collection('user').findOne()
            let data = await db.collection("url").findOneAndUpdate({"createdBy":""},{$set:{"createdBy":user._id}})
    res.status(200).json(data)
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
            const msg = {
                to: data['ops'][0]['username'], // Change to your recipient
                from: 'kowshikerappajipatel@gmail.com', // Change to your verified sender
                subject: 'Sending with SendGrid is Fun',
                text: 'and easy to do anywhere, even with Node.js',
                html: '<strong>and easy to do anywhere, even with Node.js</strong>',
              }
              sgMail
                .send(msg)
                .then(() => {
                  console.log('Email sent')
                })
                .catch((error) => {
                  console.error(error)
                })
            //send the link of heroku/validate?_id object 
            res.status(200).json({data})
            client.close()
        })
    })
    
})


app.listen(port,()=>{console.log("server started at port" + port)})

