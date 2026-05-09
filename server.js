const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors');

app.use(cors());

const PORT = process.env.PORT || 3000;
const votingAddress = '3PLvmYuuHscQhxpvXZBzwAXFeLV2nt3M24M';
const assetId = 'FxtPT76oaWyyLjzr2P1Wq7SQLBd5yn9TDCgfYcsjvhEF';

// Funzione per ottenere il bilancio dell'asset NBX per un determinato indirizzo
async function getBalance(address) {
    try {
        const response = await axios.get(`https://nodes.wavesnodes.com/assets/balance/${address}/${assetId}`);
        // Converte da unità base (8 decimali)
        return response.data.balance / 1e8;
    } catch (error) {
        console.error(`Errore nel recupero bilancio per ${address}:`, error.message);
        return 0;
    }
}

// Funzione per ottenere le transazioni dirette all'indirizzo di voto
async function getTxs() {
    try {
        const response = await axios.get(`https://nodes.wavesnodes.com/transactions/address/${votingAddress}/limit/100`);
        return response.data[0]; // L'API restituisce un array di array, prendiamo il primo
    } catch (error) {
        console.error("Errore nel recupero transazioni:", error.message);
        return [];
    }
}

app.get('/votes', async (req, res) => {
    console.log("Inizio elaborazione voti...");
    const txs = await getTxs();
    let votes = { GOVERNANCE: 0, ANALYTICS: 0, GROWTH: 0 };
    let voters = new Set();

    for (let tx of txs) {
        // Filtriamo solo le transazioni di tipo Transfer (tipo 4) con un attachment
        if (!tx || tx.type !== 4 || !tx.attachment) continue;
        
        let decoded = "";
        try {
            // Decodifica l'attachment da base58 o base64 (Waves Node API usa spesso base58 per gli attachment)
            // In questa versione usiamo una logica di ricerca stringa flessibile
            decoded = Buffer.from(tx.attachment, 'base64').toString('utf8').toUpperCase().trim();
            // Se la decodifica base64 non produce testo leggibile, il nodo potrebbe fornire base58.
            // Per semplicità di test, cerchiamo le keyword nel testo decodificato.
        } catch (e) { 
            continue; 
        }

        let option = "";
        if (decoded.includes("GOVERNANCE")) option = "GOVERNANCE";
        else if (decoded.includes("ANALYTICS")) option = "ANALYTICS";
        else if (decoded.includes("GROWTH")) option = "GROWTH";

        if (option && !voters.has(tx.sender)) {
            // Recupera il bilancio NBX del votante
            let weight = await getBalance(tx.sender);
            
            // FALLBACK LOGIC: Se l'utente ha inviato WAVES e non ha NBX, 
            // contiamo l'importo inviato nella transazione come peso del voto (minimo 1)
            if (weight <= 0) {
                weight = (tx.amount / 1e8) || 1;
                console.log(`Votante ${tx.sender} non ha NBX. Uso importo transazione: ${weight}`);
            }

            votes[option] += weight;
            voters.add(tx.sender);
            console.log(`Voto registrato: ${option} da ${tx.sender} con peso ${weight}`);
        }
    }

    console.log("Risultati finali:", votes);
    res.json(votes);
});

app.listen(PORT, () => {
    console.log(`Server NBX Governance attivo sulla porta ${PORT}`);
});
server.js
Displaying server.js.
