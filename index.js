const express = require('express');
const cors = require('cors');
require('dotenv').config(); 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// jwt token
const jwt = require('jsonwebtoken');

// verify jwt
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
} 

// connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bsdjaxv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri , { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 } );

async function run(){
    try{
        await client.connect();
        console.log('Real State connected successfully!');

        // collections
        const rentCollection = client.db('RealState').collection('rent');
        const usersCollection = client.db('RealState').collection('users');
        const cartCollection = client.db('RealState').collection('carts');
        const recentCollection = client.db('RealState').collection('recent');

        // ***********jwt token part**********

        // create jwt token.
        app.post('/jwt', (req,res)=>{
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '12h'})
            
            res.send({token})
        } )

        // verify admin middleware
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }
        // ***********end jwt token part**********


        // *****cart*****
        // get cart email wise
        app.get('/carts', verifyJWT, async(req, res)=>{
            const email = req.query.email;
            if(!email){
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }
            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        } )

        app.post('/carts', async(req,res) =>{
            const item = req.body;
            console.log(item);
            const result = await cartCollection.insertOne(item);
            res.send(result);
        })

        // delete cart data
        app.delete('/carts/:id', async(req,res) =>{
            const id = req.params.id;
            const query  = { _id: new ObjectId(id) };
            const result = await cartCollection.deleteOne(query);
            res.send(result);
        } )

        //***** end cart system *****


        // *****recent data part*****
        app.get('/recent' , async(req,res)=>{
            const result = await recentCollection.find().toArray();
            res.send(result);
        })
        // *****end recent data part*****


        // ***********rent apartment part**********
        // get rent info
        app.get('/rent' , async(req,res)=>{
            const result = await rentCollection.find().toArray();
            res.send(result);
        })

        // dynamic route
        app.get('/rent/:id', async(req,res)=>{
            const id = req.params.id;
            const query = { _id: new ObjectId(id)};
            const result = await rentCollection.findOne(query);
            res.send(result);
        })
        // ***********end rent apartment part**********


        // ***********user admin part**********
        // user collect to database
        app.post('/users', async(req,res) =>{
            const user = req.body;
            const query = {email: user.email}
            const existingUser = await usersCollection.findOne(query);
            console.log( 'existingUser: ', existingUser);
            if(existingUser){
                return res.send({ message: 'user already exists!' })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        } )

        // delete users
        app.delete('/users/:id', async(req,res) =>{
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        // show all users
        app.get('/users', async(req, res) =>{
            const result = await usersCollection.find().toArray();
            res.send(result);
        } )

        //** */ check user admin or not
        app.get('/users/admin/:email', verifyJWT, async(req, res)=>{
            const email = req.params.email;
            // 2ta token same kina
            if(req.decoded.email !== email ){
                res.send( {admin: false} )
            }
            const query = {email: email}
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin'}
            res.send(result);
            
        } )

        // make admin api
        app.patch('/users/admin/:id', async(req, res)=>{
            const id = req.params.id;
            const filter = {_id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            }
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })
        // ***********end user admin part**********


    }
    finally{

    }
}
run().catch(console.dir);
// connection end

app.get('/', (req, res) => {
    res.send('Real State running');
})

app.listen(port, ()=> {
    console.log(`Real State running at ${port}` );
}) 