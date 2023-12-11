const express = require('express');
const cors = require('cors');
require('dotenv').config(); 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const rentCollection = client.db('RealState').collection('rent');

        // rent 
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