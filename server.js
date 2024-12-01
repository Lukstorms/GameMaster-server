const express = require('express');
const cors = require('cors');
const readline = require('readline');
const Groq = require('groq-sdk');

const app = express();
const port = 8000; // Or your preferred port

console.log('Initializing CORS middleware...');
app.use(cors({
    origin: 'http://localhost:3000', // Adjust if your front-end is on a different port
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
    credentials: true
}));
console.log('CORS middleware initialized.');

app.use(express.json()); // Middleware to parse JSON bodies

console.log('groq-sdk module loaded.');

const client = new Groq({
    apiKey: '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',
});
console.log('Groq client initialized.');

const personality = {
    role: 'system',
    content: `
        Você é um mestre de RPG experiente, que sempre mestra campanhas desafiadoras e inteligentes. O seu objetivo, é
        interagir com o usuário, e contar a ele uma história onde as decisões dele vão gerando os novos trechos da 
        história, o usuário vai selecionar o tema da história, e você deve seguir o estilo e a temática da história
        (por exemplo, velho oeste oy cyberpunk) e deverá ao final de cada novo trecho da história que você narrar para
        o usuário, oferecer para ele entre 3 e 5 opções de como ele poderá proceder na história, ou resolver um 
        determinado problema. A história deverá ter um final, e ter no mínimo 7 e no máximo 10 interações com o usuário
        construa a história para que ela esteja se encaminhando para o final nesse momento, mas que o final chegue de 
        maneira orgânica, sem quebrar a narrativa da história. O usuário vai selecionar o número da resposta e colocá-lo
        no prompt, e você deve seguir a história a partir daquele número, traga dessa forma:    
        Você tem as seguintes opções:
        1 - Opção 1
        2 - Opção 2
        3 - Opção 3
        4 - Opção 4
        ...
        Caso o usuário digite a opção 2, por exemplo, você deve continuar a gerar a história a partir daquele prompt.
    `,
};

let chatHistory = [personality];

app.post('/chat', async (req, res) => {
    console.log('Received request body:', req.body);
    const userInput = req.body.message;

    // Add user input to chat history
    chatHistory.push({ role: 'user', content: userInput });

    try {
        // Send the prompt to the API
        const completion = await client.chat.completions.create({
            model: 'llama-3.1-70b-versatile',
            messages: chatHistory,
            temperature: 0.3,
            max_tokens: 8000,
            top_p: 1,
            stream: true,
            stop: null,
        });

        // Collect the response
        let responseContent = '';
        for await (const chunk of completion) {
            if (chunk.choices && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                responseContent += chunk.choices[0].delta.content;
            }
        }

        // Add response to chat history
        chatHistory.push({ role: 'assistant', content: responseContent });

        // Send the response back to the client
        res.json({ message: 'Request received', response: responseContent });
    } catch (e) {
        // Handle the error
        const errorMessage = `Houve um erro no processamento: ${e}. Por favor, repita a pergunta.`;
        chatHistory.push({ role: 'user', content: errorMessage });

        // Send the error message to the API for explanation
        const errorCompletion = await client.chat.completions.create({
            model: 'llama-3.1-70b-versatile',
            messages: chatHistory,
            temperature: 0.3,
            max_tokens: 8000,
            top_p: 1,
            stream: true,
            stop: null,
        });

        // Collect the error explanation
        let errorResponseContent = '';
        for await (const chunk of errorCompletion) {
            if (chunk.choices && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                errorResponseContent += chunk.choices[0].delta.content;
            }
        }

        // Add error explanation to chat history
        chatHistory.push({ role: 'assistant', content: errorResponseContent });

        // Send the error explanation back to the client
        res.json({ message: 'Error occurred', response: errorResponseContent });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});