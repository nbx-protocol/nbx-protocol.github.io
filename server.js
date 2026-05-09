const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors');
// La libreria bs58 serve per decodificare gli attachment di Waves
const bs58 = require('bs58'); 

app.use(cors());

const PORT = process.env.PORT || 3000;
const votingAddress = '3PLvmYuuHscQhxpvXZBzwAXFeLV2nt3M24M';
const assetId = 'FxtPT76oaWyyLjzr2P1Wq7SQLBd5yn9TDCgfYcsjvhEF';

async function getBalance(address) {
    try {
        const response = await axios.get(`https://nodes.wavesnodes.com/assets/balance/${address}/${assetId}`);
        return response.data.balance / 1e8;
    } catch (e) { return 0; }
}

app.get('/votes', async (req, res) => {
    try {
        // API Explorer per trovare le transazioni di voto
        const url = `https://api.wavesplatform.com/v0/transactions/transfer?recipient=${votingAddress}&limit=50`;
        const response = await axios.get(url);
        const txs = response.data.data;

        let votes = { GOVERNANCE: 0, ANALYTICS: 0, GROWTH: 0 };
        let voters = new Set();

        for (let item of txs) {
            const tx = item.data;
            if (!tx.attachment || voters.has(tx.sender)) continue;

            let decoded = "";
            try {
                // Decodifica da Base58
                const bytes = bs58.decode(tx.attachment);
                decoded = Buffer.from(bytes).toString('utf8').toUpperCase();
            } catch (e) { continue; }
            
            let option = "";
            if (decoded.includes("GOVERNANCE")) option = "GOVERNANCE";
            else if (decoded.includes("ANALYTICS")) option = "ANALYTICS";
            else if (decoded.includes("GROWTH")) option = "GROWTH";

            if (option) {
                let weight = await getBalance(tx.sender);
                // Fallback: se non ha NBX, usiamo l'importo della transazione (es. 1 Waves)
                if (weight <= 0) weight = (tx.amount / 1e8) || 1;
                
                votes[option] += weight;
                voters.add(tx.sender);
            }
        }
        res.json(votes);
    } catch (error) {
        res.status(500).json({ error: "Errore API", details: error.message });
    }
});

app.listen(PORT, () => console.log(`Server attivo su porta ${PORT}`));
