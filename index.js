const express = require("express");
const cors = require("cors");
const cookeParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookeParser());

const logger = (req, res, next) => {
  console.log("Inside the logger");
  next();
};

const verifyToken = (req, res, next) => {
  // console.log("Verify Token", req.cookies);
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "Unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

app.post("/jwt", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });
  res
    .cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    })
    .send({ success: true });
});

app.get("/", (req, res) => {
  res.send("Job hunting.......");
});

// Mongodb

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.b4uwa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Database create
    const jobCollections = client.db("jobPortal").collection("jobs");
    const jobApplicationCollections = client
      .db("jobPortal")
      .collection("job_applications");

    app.post("/jobs", async (req, res) => {
      const newJobs = req.body;
      const result = await jobCollections.insertOne(newJobs);
      res.send(result);
    });

    app.get("/jobs", logger, async (req, res) => {
      const result = await jobCollections.find().toArray();
      console.log("cookiesssss", req.cookies);
      res.send(result);
    });
    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollections.findOne(query);
      res.send(result);
    });

    // Job application API
    app.post("/job-applications", async (req, res) => {
      const newApply = req.body;
      const result = await jobApplicationCollections.insertOne(newApply);
      res.send(result);
    });
    // app.get("/job-applications", async (req, res) => {
    //   const result = await jobApplicationCollections.find().toArray();
    //   res.send(result);
    // });

    app.get("/job-applications/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (req.user.email !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const query = {
        applicant_email: email,
      };

      const result = await jobApplicationCollections.find(query).toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("Server is running on port:", port);
});
