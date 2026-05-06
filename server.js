const express = require('express');
const cors = require('cors');

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ✅ PORT per Render
const PORT = process.env.PORT || 3000;

// 🔹 CONFIG
const votingAddress = "3PLvmYuuHscQhxpvXZBzwAXFeLV2nt3M24M";
const assetId = "FxtPT76oaWyyLjzr2P1Wq7SQLBd5yn9TDCgfYcsjvhEF";

// 🔹 fetch helper (Node 18+)
async function fetchJSON(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.log("Fetch error:", err.message);
        return null;
    }
}

// 🔹 prendi transazioni
async function getTxs() {
    const url = `https://api.wavesplatform.com/v0/transactions/transfer?recipient=${votingAddress}&limit=100`;
    const json = await fetchJSON(url);

    if (!json || !json.data || !Array.isArray(json.data)) {
        console.log("TX API non valida");
        return [];
    }

    return json.data;
}

// 🔹 balance
async function getBalance(address) {
    const url = `https://nodes.wavesnodes.com/assets/balance/${address}/${assetId}`;
    const json = await fetchJSON(url);

    if (!json) return 0;

    return (json.balance || 0) / 1e8;
}

// 🔹 endpoint voti
app.get('/votes', async (req, res) => {

    console.log("Fetching votes...");

    const txs = await getTxs();

    let votes = {
        GOVERNANCE: 0,
        ANALYTICS: 0,
        GROWTH: 0
    };

    let voters = new Set();

    for (let tx of txs) {

        if (!tx || !tx.attachment) continue;

        let decoded = "";

        try {
            decoded = Buffer.from(tx.attachment, 'base64').toString();
        } catch {
            continue;
        }

        if (!decoded.startsWith("VOTE:")) continue;

        const option = decoded.replace("VOTE:", "").trim();

        // ✅ anti-spam: 1 voto per wallet
        if (voters.has(tx.sender)) continue;

        const balance = await getBalance(tx.sender);

        // ✅ filtro minimo
        if (balance < 1) continue;

        if (votes[option] !== undefined) {
            votes[option] += balance;
            voters.add(tx.sender);
        }
    }

    res.json(votes);
});

// 🔹 health check (utile per Render)
app.get('/health', (req, res) => {
    res.json({ status: "OK" });
});

// 🔹 homepage (opzionale)
app.get('/', (req, res) => {
    res.send("NBX Governance API is running");
});

// ✅ AVVIO SERVER (Render-ready)
app.listen(PORT, () => {
    console.log(`NBX Governance live on port ${PORT}`);
});
