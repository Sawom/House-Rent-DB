const express = require('express');
const cors = require('cors');
require('dotenv').config(); 
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
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
        const bookingCollection = client.db('RealState').collection('booking');
        const reviewsCollection = client.db('RealState').collection('review');
        const paymentCollection = client.db('RealState').collection('payments');


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

        // *****payment*****
        // create payment intent
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })

        })

        // payment add to database
        app.post('/payments', verifyJWT, async(req,res)=>{
            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);
            const query = { _id: { $in: payment.cartItems.map(id => new ObjectId(id)) } }
            const deleteResult = await cartCollection.deleteMany(query)
            res.send({ insertResult, deleteResult });
        })
        // *****end payment*****


        // *****reviews part*****
        // get review
        app.get('/review' , async(req, res)=>{
            const result = await reviewsCollection.find().toArray();
            res.send(result);
        } )

        // review delete
        app.delete('/review/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await reviewsCollection.deleteOne(query);
            res.send(result);
        } )

        // add reviews
        app.post('/review', async(req,res)=>{
            const newReview = req.body;
            const result = await reviewsCollection.insertOne(newReview);
            res.send(result);
        })
        // *****end reviews part*****


        // *****booking*****
        // add booking
        app.post('/booking', async(req,res)=>{
            const newBooking = req.body;
            const result = await bookingCollection.insertOne(newBooking);
            res.send(result);
        })

        // get booking data email wise
        app.get('/booking', async(req,res)=>{
            const email = req.query.email;
            if(!email){
                res.send([]);
            }
            const query = { email: email };
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })

        // delete booking
        app.delete('/booking/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        })
        // *****end booking*****


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