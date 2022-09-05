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

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db("bate_papo_uol");
});

function timeCalculator() {
    return dayjs().format("HH:mm:ss");
}

app.post('/participants', async (req, res) => {
    let { name, lastStatus } = req.body;
    const nameCheck = await db.collection('participants').findOne({
        name: name,
    });
    if (nameCheck) {
        res.status(409).send("Esse nome já existe na lista!");
        return;
    }

    const time = timeCalculator();
    const statusMessage = {
        from: name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: time
    };
    const schema = Joi.object({
        name: Joi.string().min(1).required().trim(),
    });
    try {
        const value = await schema.validateAsync({ name });
    } catch (error) {
        return res.status(422).send("Campo obrigatório!");
    }
    lastStatus = Date.now();
    const participantsResult = await db.collection('participants').insertOne({ name, lastStatus }).then(() => {
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
    })
})

app.post('/messages', async (req, res) => {
    const { to, text, type } = req.body;
    const from = req.headers.user;

    const schema = Joi.object({
        to: Joi.string().min(1).required(),
        text: Joi.string().min(1).required().trim(),
        type: Joi.string().valid('message', 'private_message').required()
    })
    try {
        const value = await schema.validateAsync({ to, text, type });
    } catch (error) {
        res.sendStatus(422);
        return;
    }
    const fromCheck = await db.collection('participants').findOne({
        name: from,
    });
    if (!fromCheck) {
        res.status(422).send("Não existe esse usuário");
        return;
    }
    
    await db.collection('participants')

    const time = timeCalculator();

    const result = await db.collection('messages').insertOne({ to, type, from, time, text }).then(() => {
        console.log(`${from} enviou mensagem`);
    });
    return res.sendStatus(201);
})

app.get('/messages', async (req, res) => {
    let { limit } = req.query;
    const from = req.headers.user;
    const selectedArray = [];
    try {
        const result = await db.collection('messages').find().toArray();
        for (let i = 0; i < result.length; i++) {
            if (result[i].to === 'Todos') {
                selectedArray.push(result[i]);
                continue;
            }
            else if (result[i].to === from) {
                selectedArray.push(result[i]);
                continue;
            }
            else if (result[i].from === from) {
                selectedArray.push(result[i]);
                continue;
            }
        }
        if (limit) {
            var newResult = selectedArray.slice(-limit);
            res.send(newResult);
            return;
        }
        res.send(selectedArray);
    } catch (error) {
        res.sendStatus(422);
    }
});

app.post('/status', async (req, res) => {
    const from = req.headers.user;
    try {
        const participant = await db.collection('participants').findOne({ name: from });
        console.log(participant);
        participant.lastStatus = Date.now();
        await db.collection('participants').updateOne({ _id: participant._id }, {$set:participant});
        console.log('ta funcionando')
        return res.sendStatus(200);
    } catch (error) {
        console.log('nao esta funcionando')
        return res.sendStatus(404);
    }
});

app.delete('/messages/:id', async (req, res) => {
    const from = req.headers.user;
    const { id } = req.params;
    try {
        await usersColection.deleteOne({ _id: new ObjectId(id) })

    } catch (error) {
        return res.sendStatus(404);
    }
});

setInterval(async () => {
    const participants = await db.collection('participants').find().toArray();
    for (let i = 0; i < participants.length; i++) {
        var participantStatus = Date.now() - participants[i].lastStatus;
        console.log(participantStatus);
        if (participantStatus > 10000) {
            try {
                const message = {
                    from: participants[i].name,
                    to: "Todos",
                    text: "sai da sala...",
                    type: "status",
                    time: timeCalculator()
                }
                await db.collection('messages').insertOne(message);
                await db.collection('participants').deleteOne(participants[i]);
            } catch (error) {
                console.log('deu ruim');
            }
        }
    }
}, 15000);



app.listen(5000, () => { console.log("Ouvindo") });