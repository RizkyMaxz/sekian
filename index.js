import express from 'express';
import path from 'path';
import generatorEmail from './generatorEmail.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public'))); // Serve static HTML files

app.get('/generate', async (req, res) => {
    const { domain } = req.query;
    try {
        const result = await generatorEmail.generate(domain);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, result: error.message });
    }
});

app.get('/validate', async (req, res) => {
    const { email } = req.query;
    try {
        const result = await generatorEmail.validation(email);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, result: error.message });
    }
});

app.get('/inbox', async (req, res) => {
    const { email } = req.query;
    try {
        const result = await generatorEmail.inbox(email);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, result: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
