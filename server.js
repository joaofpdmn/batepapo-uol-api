import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from "dotenv";
import Joi from 'joi';
import dayjs from 'dayjs';
import customParseFormat from "dayjs/plugin/customParseFormat.js";


const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();
dayjs.extend(customParseFormat);
dayjs.locale('de');

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db("bate_papo_uol");
});

app.post('/participants', async (req, res) => {
    let { name, lastStatus } = req.body;
    const nameCheck = await db.collection('participants').findOne({
        name: name,
    });
    if(nameCheck){
        res.status(409).send("Esse nome já existe na lista!");
        return;
    }

    const time = dayjs(Date.now(), "HH:MM:SS", 'de');
    const statusMessage = {
        from: name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: time
    };
    const schema = Joi.object({
        name: Joi.string().min(1).required(),
    });
    try {
        const value = await schema.validateAsync({ name });
        console.log('deu bom');
    } catch (error) {
        return res.status(422).send("Campo obrigatório!");
    }
    lastStatus = Date.now();
    const participantsResult = await db.collection('participants').insertOne({name, lastStatus}).then(() => {
        res.send('Ok');
    });
    const messageResult = await db.collection('messages').insertOne(statusMessage).then(() => {
        console.log('Status enviado.')
    })
    return res.status(201).send;
});

app.get('/participants', (req, res) => {
    db.collection('participants').find().toArray().then(data => {
        res.send(data);
        console.log(data);
    })
})

app.post('/messages', async (req, res) => {
    const { to, text, type} = req.body;
    const { from } = req.headers;

    const schema = Joi.object({
        to: Joi.string().min(1).required(),
        text: Joi.string().min(1).required(),
        type: Joi.string().valid('message', 'private_message').required()
    })
    try {
        const value = await schema.validateAsync({to, text, type});
        console.log('Funcionou');
    } catch (error) {
        res.status(422).send('deu ruim');
    }

    const time = dayjs(Date.now(), "HH:MM:SS", 'de');

    const result = await db.collection('messages').insertOne({to, type, from, time, text}).then(() => {
        res.send('Ok');
    });
    res.status(201).send;
})










app.listen(5000, () => { console.log("Ouvindo")});