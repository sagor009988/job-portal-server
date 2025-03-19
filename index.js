const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

const app = express();

// middleware

// Enable CORS with credentials support
app.use(
  cors({
    origin: ["http://localhost:5173"], // Change this to your frontend URL
    credentials: true, // Allow cookies
  })
);
app.use(express.json());
app.use(cookieParser());

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

    //  create token

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_TOKEN, { expiresIn: "1h" });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    const verifyToken = (req, res, next) => {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).send({ message: "unAuthorized  access" });
      }
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_TOKEN,
          (err, decoded) => {
            if (err) {
              return res.status(401).send({ message: "unauthorized access" });
            }
            req.user = decoded;
          }
        );
        next();
      } catch (err) {}
    };

    // clear cookies after logout
    app.post("/lout", (req, res) => {
      console.log("Cookies before clearing:", req.cookies); // ✅ Debugging

      res.clearCookie("token", {
        httpOnly: true,
        secure: false,
      });

      console.log("Cookies after clearing:", req.cookies); // ✅ Check if it clears

      res.json({ success: true });
    });
    // applied job relate api
    // post applied job
    app.post("/job_application", async (req, res) => {
      const appliedJob = req.body;
      const result = await jobApplicationCollection.insertOne(appliedJob);

      //   apply er pore jobCollection er value k new applicationCount field dara update korar way

      const id = appliedJob.job_id;
      const query = { _id: new ObjectId(id) };
      const jobs = await jobsCollection.findOne(query);
      let count = 0;
      if (jobs.applicationCount) {
        count = jobs.applicationCount + 1;
      } else {
        count = count + 1;
      }

      // update the job ,which has been only apply from jobCollection

      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          applicationCount: count,
        },
      };

      const appliedCountableJob = await jobsCollection.updateOne(
        filter,
        updatedDoc
      );

      res.send(result);
    });

    // get applied jobs by email

    app.get("/jobApplications", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { user_email: email };

      //  console.log("user",req.user.email);
      //  console.log("q",req.query.email);
      if (req.user.email !== req.params.email) {  
        return res.status(403).send({ message: "forbidden  access" });
      }

      const result = await jobApplicationCollection.find(query).toArray();

      //   find job details which applied
      for (const application of result) {
        const jobDetailsId = application.job_id;
        const query2 = { _id: new ObjectId(jobDetailsId) };
        const result2 = await jobsCollection.findOne(query2);
        if (result2) {
          (application.title = result2.title),
            (application.company = result2.company),
            (application.company_logo = result2.company_logo);
          application.location = result2.location;
        }
      }
      res.send(result);
    });

    // find how many applicant applied in your every  posted job

    app.get(
      "/appliedDetails-forMyPostedJobs/jobs/:job_id",
      async (req, res) => {
        const id = req.params.job_id;
        const query = { job_id: id };
        const result = await jobApplicationCollection.find(query).toArray();
        res.send(result);
      }
    );

    app.patch("/my-postedJob-status/:id", async (req, res) => {
      const id = req.params.id;
      const value = req.body;
      const query = {
        _id: new ObjectId(id),
      };
      const updatedDoc = {
        $set: {
          status: value.status,
        },
      };
      const result = await jobApplicationCollection.updateOne(
        query,
        updatedDoc
      );
      res.send(result);
    });

    // jobs related api

    // add a new job
    app.post("/newJobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    });

    // get all jobs
    app.get("/jobs", async (req, res) => {
      // find also if find by email
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email };
      }

      const jobs = jobsCollection.find(query);
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
