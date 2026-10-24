require('dotenv').config();
require('express-async-errors');
const express = require('express'), cors = require('cors'), mongoose = require('mongoose'), jwt = require('jsonwebtoken');
const app = express();
app.use(cors({origin: process.env.FRONT_URL || '*'}));
app.use(express.json());

const opts = {toJSON: {versionKey: false, transform: (_, o) => { o.id = o._id; delete o._id; }}};
const Item = mongoose.model('Item', new mongoose.Schema({name: {type: String, required: true}, description: String, price_xp: {type: Number, default: 0}, emoji: {type: String, default: 'feliz.png'}}, opts));
const Msg = mongoose.model('Message', new mongoose.Schema({name: String, email: String, text: String}, {...opts, timestamps: {createdAt: 'created_at', updatedAt: false}}));
const seed = [['Emblema Estudioso','Muestra tu constancia.',50,'estudiando.png'],['Collar Morado','Estilo para Snoopy.',80,'conforme.png'],['Avatar Piloto','Snoopy as del aire.',120,'idea.png'],['Corona Experto','Para nivel 5 o más.',200,'nivel experto.png']]
  .map(([name, description, price_xp, emoji]) => ({name, description, price_xp, emoji}));

const auth = (req, res, next) => { try { jwt.verify((req.headers.authorization || '').slice(7), process.env.JWT_SECRET); next(); } catch { res.status(401).json({error: 'No autorizado'}); } };

app.get('/', (_, res) => res.json({ok: true}));
app.get('/api/catalog', async (_, res) => res.json(await Item.find().sort('_id')));
app.post('/api/catalog', auth, async (req, res) => { const {name, description, price_xp, emoji} = req.body; res.status(201).json(await Item.create({name, description, price_xp, emoji})); });
app.delete('/api/catalog/:id', auth, async (req, res) => { await Item.findByIdAndDelete(req.params.id); res.json({ok: true}); });
app.post('/api/messages', async (req, res) => { const {name, email, text} = req.body; if (!name || !email || !text) return res.status(400).json({error: 'Faltan datos'}); res.status(201).json(await Msg.create({name, email, text})); });
app.get('/api/messages', auth, async (_, res) => res.json(await Msg.find().sort('-created_at')));
app.post('/api/login', (req, res) => {
  const {email, password} = req.body;
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) return res.json({token: jwt.sign({email}, process.env.JWT_SECRET, {expiresIn: '8h'})});
  res.status(401).json({error: 'Credenciales inválidas'});
});
app.use((e, _req, res, _next) => { console.error(e); res.status(500).json({error: 'Error del servidor'}); });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  if (!(await Item.countDocuments())) await Item.insertMany(seed);
  app.listen(process.env.PORT || 3000, () => console.log('API lista y conectada a MongoDB'));
}).catch(e => { console.error('Error al conectar con MongoDB:', e.message); process.exit(1); });
