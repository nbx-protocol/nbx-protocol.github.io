const express = require('express');
const cors = require('cors');

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ PORT per Render (fondamentale process.env.PORT)
const PORT = process.env.PORT || 3000;

// 🔹 CONFIG
const votingAddress = "3PLvmYuuHscQhxpvXZBzwAXFeLV2nt3M24M";
const assetId = "FxtPT76oaWyyLjzr2P1Wq7SQLBd5yn9TDCgfYcsjvhEF";

// 🔹 fetch helper
async function fetchJSON(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error("Fetch error:", err.message);
        return null;
    }
}

// 🔹 prendi transazioni
async function getTxs() {
    const url = `https://api.wavesplatform.com/v0/transactions/transfer?recipient=${votingAddress}&limit=100`;
    const json = await fetchJSON(url);
    return (json && json.data && Array.isArray(json.data)) ? json.data : [];
}

// 🔹 balance
async function getBalance(address) {
    const url = `https://nodes.wavesnodes.com/assets/balance/${address}/${assetId}`;
    const json = await fetchJSON(url);
    return json ? (json.balance || 0) / 1e8 : 0;
}

// 🔹 health check (Messo in alto per priorità)
app.get('/health', (req, res) => {
    console.log("Health check pinged");
    res.status(200).json({ status: "OK", service: "NBX-API" });
});

// 🔹 endpoint voti
app.get('/votes', async (req, res) => {
    console.log("Processing votes...");
    const txs = await getTxs();
    let votes = { GOVERNANCE: 0, ANALYTICS: 0, GROWTH: 0 };
    let voters = new Set();

    for (let tx of txs) {
        if (!tx || !tx.attachment) continue;
        let decoded = "";
        try {
            decoded = Buffer.from(tx.attachment, 'base64').toString();
        } catch { continue; }

        if (!decoded.startsWith("VOTE:")) continue;
        const option = decoded.replace("VOTE:", "").trim().toUpperCase();

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
    res.send("NBX Governance API is running. Use /health or /votes");
});

// ✅ AVVIO SERVER
app.listen(PORT, () => {
    console.log(`NBX Governance live on port ${PORT}`);
});
