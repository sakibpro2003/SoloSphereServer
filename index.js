const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: "unauthorized access" });

  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      console.log(decoded);
      req.user = decoded;

      console.log(token);
      next();
    });
  }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cphe2d0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// const uri =  "mongodb://localhost:27017/" ;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const jobCollection = client.db("soloSphere").collection("jobs");
const bidCollection = client.db("soloSphere").collection("bids");

async function run() {
  try {
    //jwt generate

    app.post("/jwt", async (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // clear token

    app.get("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 0,
        })
        .send({ success: true });
    });

    // api's
    app.post("/bid", async (req, res) => {
      const data = req.body;
      const result = await bidCollection.insertOne(data);
      // console.log(result)
      res.send(result);
    });

    // app.get("/getup/:id",(req,res)=>{

    // })

    app.post("/addjob", async (req, res) => {
      const data = req.body;
      const result = await jobCollection.insertOne(data);
      // console.log(result)
      res.send(result);
    });

    app.delete("/jobdelete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/mypostedjobs/:email", verifyToken, async (req, res) => {

      const tokenEmail = req.user.email ;

      console.log(tokenData,"from tokentdata")
      const email = req.params.email;
      if(tokenEmail !== email){
        return res.status(403).send({message: 'forbidden access'})
      }
      // console.log(email)

      const query = { "buyer.buyer_email": email };
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    });

    // get all my bids data
    app.get("/mybids/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    });
    // get all bid requests
    app.get("/bid-request/:email", async (req, res) => {
      const email = req.params.email;
      const query = { buyer_email: email };
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    });

    //update bid status api
    app.patch("/bidupdate/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: status,
      };

      const result = await bidCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // app.get('/bid-requests/:email', verifyToken, async (req, res) => {
    //   const email = req.params.email
    //   const query = { 'buyer.email': email }
    //   const result = await bidsCollection.find(query).toArray()
    //   res.send(result)
    // })

    app.put("/update/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const jobData = req.body;
      console.log(jobData);
      // const result = await
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...jobData,
        },
      };
      const result = await jobCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    app.get("/jobs", async (req, res) => {
      const result = await jobCollection.find().toArray();
      res.send(result);
    });

    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    //   await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //   await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("hello from the other side");
});

app.listen(port, () => {
  console.log(`server running on port: ${port}`);
});
