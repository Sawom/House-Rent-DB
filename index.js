const express = require('express');
const cors = require('cors');
require('dotenv').config(); 
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bsdjaxv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri , { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 } );

async function run(){
    try{
        await client.connect();
        console.log('Real State connected successfully!');

        // collections
        const propertiesCollection = client.db('RealState').collection('properties');
        const userCollection = client.db('RealState').collection('user')
        const paymentCollection = client.db('RealState').collection('payment')
        const landlordCollection = client.db('RealState').collection('landlord')
        const bookingCollection = client.db('RealState').collection('booking')

        // properties
        app.get('/properties' , async(req,res)=>{
            const result = await propertiesCollection.find().toArray();
            res.send(result);
        })

        // user
        app.get('/user' , async(req,res)=>{
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        //payment
        app.get('/payment' , async(req,res)=>{
            const result = await paymentCollection.find().toArray();
            res.send(result);
        }) 

        // landlord
        app.get('/landlord' , async(req,res)=>{
            const result = await landlordCollection.find().toArray();
            res.send(result);
        })

        // booking
        app.get('/booking' , async(req,res)=>{
            const result = await bookingCollection.find().toArray();
            res.send(result);
        })

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