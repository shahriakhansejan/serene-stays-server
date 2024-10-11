const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:5173', 'https://serene-stays-ab67f.web.app', 'https://serene-stays-ab67f.firebaseapp.com/'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ocam1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


// custom middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  console.log('token in the middleware', token)
  if (!token) {
    return res.status(401).send({ message: 'unauthorized' });
  }
  else {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      console.log({ decoded });
      if (err) {
        return res.send({ message: "unauthorized access" });
      }
      else {
        req.user = decoded;
        next()
      }
    })
  }
};

// for vercel
const cookeOption = {
  httpOnly: true,
  secure: true,
  sameSite: "None"
}

//  *****For Localhost 
// const cookeOption = {
//   httpOnly: true,
//   secure: false,
//   sameSite: "strict"
// }



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const roomDataCollection = client.db("sereneStays").collection("roomData")
    const usersDataCollection = client.db("sereneStays").collection("usersData")
    const bookingsDataCollection = client.db("sereneStays").collection("bookingsData")
    const subscribeData = client.db("sereneStays").collection("subscribe")

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log('user for token', user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      // res.send({token});

      res.cookie("token", token, cookeOption).send({ success: true });
    })

    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log('logout user', user);

      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });



    app.get('/rooms', async (req, res) => {
      const result = await roomDataCollection.find().toArray();
      res.send(result);
    })

    app.post('/rooms/:id', async (req, res) => {
      const id = req.params.id;
      const newReview = req.body;
      const currentDate = new Date().toISOString();
      const newReviewWithDate = { ...newReview, currentDate }
      const query = { _id: new ObjectId(id) }
      const updateReview = {
        $push: {
          reviews: newReviewWithDate
        }
      }
      const result = await roomDataCollection.updateOne(query, updateReview);
      res.send(result)
    })

    app.patch('/rooms/:id', async (req, res) => {
      const id = req.params.id;
      const bookedDate = req.body;
      const filter = { _id: new ObjectId(id) }
      const updateReview = {
        $set: {
          Availability: bookedDate
        }
      }
      const result = await roomDataCollection.updateOne(filter, updateReview);
      res.send(result)
    })

    app.post('/bookings', async (req, res) => {
      const newBooking = req.body;
      const result = await bookingsDataCollection.insertOne(newBooking)
      res.send(result)
    })

    app.get('/bookings', verifyToken, async (req, res) => {
      const email = req.query.email;
      console.log('owner', req.user)
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: 'forbidden' })
      }
      const query = { email: email }
      const result = await bookingsDataCollection.find(query).sort({ _id: -1 }).toArray();
      res.send(result);
    })


    app.get('/bookings-date', async (req, res) => {
      const id = req.query.id;
      const query = { roomId: id }
      const option = {
        projection: { bookedDate: 1 }
      }
      const result = await bookingsDataCollection.find(query, option).toArray();
      res.send(result);
    })




    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = req.body;
      const filter = { _id: new ObjectId(id) }
      const updateReview = {
        $set: {
          bookedDate: query
        }
      }
      const result = await bookingsDataCollection.updateOne(filter, updateReview);
      res.send(result)
    })

    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookingsDataCollection.deleteOne(query);
      res.send(result)
    })

    app.get('/rooms/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await roomDataCollection.findOne(query)
      res.send(result);
    })


    app.post('/users', async (req, res) => {
      const newUser = req.body;
      const result = await usersDataCollection.insertOne(newUser)
      res.send(result)
    })

    app.get('/users', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.json({ success: false, message: "Email is required!" });
      }
      const query = { email: email }
      const result = await usersDataCollection.findOne(query);
      res.send(result)
    })

    app.post('/subscribe', async (req, res) => {
      const data = req.body;
      const result = await subscribeData.insertOne(data)
      res.send(result)
    })

    app.get('/subscribe', async (req, res) => {
      const data = req.query.email;
      const query = { email: data }
      const result = await subscribeData.findOne(query)
      res.send(result)
    })





    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);






app.get('/', async (req, res) => {
  res.send('Serene-Stays server is running......')
})

app.listen(port, () => {
  console.log(`Serene-stays server is running on port: ${port}`)
})

