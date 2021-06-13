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
      let user = await db.collection('user').findOneAndUpdate({"_id":req.params.id},{$set:{'isActive':true}})
      res.redirect('https://friendly-feynman-57301c.netlify.app/useractivated') 
})

app.post("/newuser",async (req,res)=>{
    
    bcrypt.genSalt(11,(err,salt)=>{
        bcrypt.hash(req.body["password"],salt, async (err,hash)=>{
            console.log(req.body)
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
              service:'gmail',
              auth:{ 
                user:process.env.EMAIL,
                pass:process.env.PASSWORD
              }
            });

            let mailOptions = {
              to: data['ops'][0]['username'],
              from :'mahesh',
              subject: 'microURL account validation',
              text: '',
              html: `<p>Hi ${data['ops'][0]['firstName']}, \n You had recently registered for microURL service.Click on the below button to activate your account and make your life hassle free with URLs </p>\n <a href='https://kp-microurl.herokuapp.com/useractivate/${data['ops'][0]['_id']}'><button >Activate account</button>`
            }
            transporter.sendMail(mailOptions)
            .then((response)=>{
              console.log(response)
              res.status(200).json({data,response})
            })
            .catch(err=>{console.log(err)})
            
            
            
            client.close()
        })
    })
    
})


app.listen(port,()=>{console.log("server started at port " + port)})

