const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

const app = express();

// middleware

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.okjp9zn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const database = client.db("jobsDB");
    const jobsCollection = database.collection("jobs");
    const jobApplicationCollection = database.collection("job-applications");

    // post applied job
    app.post("/job_application", async (req, res) => {
      const jobs = req.body;
      const result = await jobApplicationCollection.insertOne(jobs);
      res.send(result);
    });

    // get applied jobs by email

    app.get("/jobApplications", async (req, res) => {
      const email = req.query.email;
      console.log(email);

      const query = { user_email: email };
      const result = await jobApplicationCollection.find(query).toArray();

      //   find job details which applied
      for (const application of result) {
        const jobDetailsId = application.job_id;
        const query2 = { _id: new ObjectId(jobDetailsId) };
        const result2 = await jobsCollection.findOne(query2);
        if(result2){
            application.title=result2.title,
            application.company=result2.company,
            application.company_logo=result2.company_logo
            application.location=result2.location
        }
      }
      res.send(result)
    });

    // get all jobs
    app.get("/jobs", async (req, res) => {
      const jobs = jobsCollection.find();
      const result = await jobs.toArray();
      res.send(result);
    });

    // get single
    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
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

app.get("/", (req, res) => {
  res.send("hello world");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
