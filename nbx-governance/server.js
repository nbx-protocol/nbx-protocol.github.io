const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));

const PORT = 3000;

const votingAddress = "3PLvmYuuHscQhxpvXZBzwAXFeLV2nt3M24M";
const assetId = "FxtPT76oaWyyLjzr2P1Wq7SQLBd5yn9TDCgfYcsjvhEF";

// 🔹 fetch helper (Node 18+)
async function fetchJSON(url) {
    const res = await fetch(url);
    return await res.json();
}

// 🔹 prendi transazioni
async function getTxs() {
    try {
        const url = `https://api.wavesplatform.com/v0/transactions/transfer?recipient=${votingAddress}&limit=100`;
        const json = await fetchJSON(url);

        if (!json.data || !Array.isArray(json.data)) return [];
        return json.data;

    } catch (err) {
        console.log("Errore TX:", err);
        return [];
    }
}

// 🔹 balance
async function getBalance(address) {
    try {
        const url = `https://nodes.wavesnodes.com/assets/balance/${address}/${assetId}`;
        const json = await fetchJSON(url);
        return (json.balance || 0) / 1e8;
    } catch {
        return 0;
    }
}

// 🔹 endpoint voti
app.get('/votes', async (req, res) => {

    const txs = await getTxs();

    let votes = {
        GOVERNANCE: 0,
        ANALYTICS: 0,
        GROWTH: 0
    };

    let voters = new Set();

    for (let tx of txs) {

        if (!tx.attachment) continue;

        let decoded = "";
        try {
            decoded = Buffer.from(tx.attachment, 'base64').toString();
        } catch { continue; }

        if (!decoded.startsWith("VOTE:")) continue;

        const option = decoded.replace("VOTE:", "").trim();

        if (voters.has(tx.sender)) continue;

        const balance = await getBalance(tx.sender);

        if (balance < 1) continue;

        if (votes[option] !== undefined) {
            votes[option] += balance;
            voters.add(tx.sender);
        }
    }

    res.json(votes);
});

// 🔹 homepage
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
    console.log(`NBX Governance live → http://localhost:${PORT}`);
});
