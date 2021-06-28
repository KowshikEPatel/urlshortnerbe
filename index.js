require('dotenv').config()
const express  =  require("express")
const mongodb = require('mongodb')
const bcrypt = require('bcrypt')
const cors = require('cors')
const randomstring = require('randomstring')
const nodemailer = require('nodemailer')
const { google } = require('googleapis')

const mongoclient = mongodb.MongoClient;
const objectid = mongodb.ObjectID
const port = process.env.PORT
const app = express()
app.use(express.json())
app.use(cors())
const dbURL = process.env.DB_URL
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URI = process.env.REDIRECT_URI
const REFRESH_TOKEN = process.env.REFRESH_TOKEN
const oAuthClient = new google.auth.OAuth2(CLIENT_ID,CLIENT_SECRET,REDIRECT_URI)
oAuthClient.setCredentials({refresh_token:REFRESH_TOKEN})


app.post('/',async (req,res)=>{
    
    const client = await mongoclient.connect(dbURL, {useNewUrlParser: true, useUnifiedTopology: true})
    let db = client.db('projecturlshort')
    let user = await db.collection('user').findOne({'username':req.body['username']})
    let currentUrl = await db.collection('url').find({'createdBy':objectid(user['_id'])}).toArray()

    bcrypt.compare(req.body['password'],user['password'])
    .then(result=>{
        console.log(result)
        if(result===true){
            
            if(user['isActive']){
                res.status(200).json({state:true,'message':'Login success',user,currentUrl})
            }
            else{
                res.status(200).json({state:false,'message':'Email and account not validated'})
            }
            
        }
        else{
            res.status(200).json({state:false,'message':'password incorrect'})
        }
    })

})

app.post('/addurl',async (req,res)=>{

    let randomstr = randomstring.generate(7);
    let microurl = `https://kp-microurl.herokuapp.com/u/` + randomstr
    const client  = await mongoclient.connect(dbURL, {useNewUrlParser: true, useUnifiedTopology: true})
    let db = client.db('projecturlshort')
    let dbresponse = await db.collection('url').insertOne({
        'urlString': microurl,
        "actualURL" : req.body['url'], 
        'createdBy': objectid(req.body['_id']),
        'totalClicks':0,
        'clickArray':{},
    })
    res.status(200).json({dbresponse,'url':dbresponse['ops'][0]['urlString']})
    client.close()
})

app.get('/u/:randomString', async (req,res)=>{

    const client  = await mongoclient.connect(dbURL, {useNewUrlParser: true, useUnifiedTopology: true})
    
    let db = client.db('projecturlshort')
    let currentTime = new Date().toLocaleString();
    let currentUrl = await db.collection('url').findOne({'urlString':`https://kp-microurl.herokuapp.com/u/`+req.params.randomString})
    
    if(currentUrl['clickArray'][currentTime.slice(0,9)]===undefined){
        currentUrl['clickArray'][currentTime.slice(0,9)] = 1;
    }
    else{
        currentUrl['clickArray'][currentTime.slice(0,9)]+= 1;
    }
    let urlResponse = await db.collection('url').findOneAndUpdate({'urlString':`https://kp-microurl.herokuapp.com/u/`+req.params.randomString},{$set:{'clickArray':currentUrl['clickArray']},$inc:{'totalClicks':1}})
    console.log(urlResponse)
    res.redirect(currentUrl['actualURL'])
    client.close()

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
            
            /*let transporter = nodemailer.createTransport({
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
            });*/

            const accessToken = await oAuthClient.getAccessToken()

            const transport  = nodemailer.createTransport({
                    service:'gmail',
                    auth:{
                            type:'OAuth2',
                            user:'kowshikerappajipatel@gmail.com',
                            clientId:CLIENT_ID,
                            clientSecret:CLIENT_SECRET,
                            refreshToken:REFRESH_TOKEN,
                            accessToken:accessToken
                        }
            })

            const mailOptions = {
                from: process.env.EMAIL,
                to: data['ops'][0]['username'],
                subject:"Hello ✔",
                text: "Hello world?",
                html:`<b>Click on the following button to activate your account</b><a href = 'https://kp-microurl.herokuapp.com/useractivate/${data['ops'][0]['_id']}'><button>Activate account</button></a>`, // html body
    
            }

            const result  = await transport.sendMail(mailOptions)
            console.log(result)
            res.status(200).json({data,result})
            client.close()
        })
    })
    
})



app.post('/forgotpw', async (req,res)=>{
    const client = await mongoclient.connect(dbURL, {useNewUrlParser: true, useUnifiedTopology: true})
    let db = client.db('projecturlshort')
    let data = await db.collection("user").findOne(req.body)
   
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
    
    let randomURL = `https://friendly-feynman-57301c.netlify.app/resetpassword/`+key
    let stored  = await db.collection('user').findOneAndUpdate(req.body,{$set:{"passwordReset":{"hasRequestedReset":true, "randomString":key}}})
    let info = await transporter.sendMail({
        from: '"felicia24@ethereal.email" <felicia24@ethereal.email>', 
        to:  data["username"], 
        subject: "Password reset string", // Subject line
        html: `<p>Hi ${data["firstName"]}, you have requested for resetting your password on onlogger.com. Click on the 
                <a href="${randomURL}">link</a> to reset your password </p> `, // html body
    });
    res.status(200).json({info,stored,key})
    client.close()
})

app.post("/resetpassword/:str",async(req,res)=>{

  bcrypt.genSalt(11,(err,salt)=>{
      if(err){
        console.log(err)
      }
      bcrypt.hash(req.body["password"],salt, async (err,hash)=>{
        
          const client = await mongoclient.connect(dbURL, {useNewUrlParser: true, useUnifiedTopology: true})
          let db = client.db('projecturlshort')
          let user = await db.collection("user").findOneAndUpdate({"passwordReset":{"hasRequestedReset":true,"randomString":req.params.str}},{$set:{"password":hash,"passwordReset":{"hasRequestedReset":false,"randomString":''}}})
          res.status(200).json({"str":req.params.str,"user":user})
          client.close()
      })})
})


app.listen(port,()=>{console.log("server started at port " + port)})

