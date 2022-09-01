import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from "dotenv";

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

console.log(process.env.MONGO_URI);
const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;


mongoClient.connect().then(() => {
    db = mongoClient.db("bate_papo_uol");
})

app.get('/', (req, res)=> {
    res.send('testando');
});



console.log('teste')

app.listen(5000);