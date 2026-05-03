const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const votingAddress = "3PLvmYuuHscQhxpvXZBzwAXFeLV2nt3M24M";
const assetId = "FxtPT76oaWyyLjzr2P1Wq7SQLBd5yn9TDCgfYcsjvhEF";

let proposals = [];
let snapshots = {};

// ===== WAVES =====

async function getTxs() {
    try {
        const url = `https://api.wavesplatform.com/v0/transactions/transfer?recipient=${votingAddress}&limit=500`;
        const res = await fetch(url);
        const json = await res.json();
        return json.data || [];
    } catch {
        return [];
    }
}

async function getBalance(address) {
    try {
        const url = `https://nodes.wavesnodes.com/assets/balance/${address}/${assetId}`;
        const res = await fetch(url);
        const json = await res.json();
        return (json.balance || 0) / Math.pow(10, 8);
    } catch {
        return 0;
    }
}

// ===== ROOT =====

app.get('/', (req, res) => {
    res.send("NBX Governance API LIVE");
});

// ===== PROPOSALS =====

app.get('/proposals', (req, res) => {
    res.json(proposals);
});

app.post('/proposals', (req, res) => {

    const { title, options } = req.body;

    const id = Date.now().toString();

    proposals.push({
        id,
        title,
        options,
        createdAt: Date.now(),
        status: "ACTIVE"
    });

    snapshots[id] = {};

    res.json({ id });
});

// ===== SNAPSHOT =====

app.post('/snapshot/:id', async (req, res) => {

    const txs = await getTxs();
    let snapshot = {};

    for (let tx of txs) {

        const addr = tx.sender;

        if (snapshot[addr]) continue;

        const balance = await getBalance(addr);

        if (balance >= 1) {
            snapshot[addr] = balance;
        }
    }

    snapshots[req.params.id] = snapshot;

    res.json({
        voters: Object.keys(snapshot).length
    });
});

// ===== VOTES =====

app.get('/votes/:id', async (req, res) => {

    const proposal = proposals.find(p => p.id === req.params.id);
    if (!proposal) return res.json({});

    const txs = await getTxs();
    const snapshot = snapshots[req.params.id] || {};

    let results = {};
    proposal.options.forEach(o => results[o] = 0);

    let voted = new Set();

    for (let tx of txs) {

        if (!tx.attachment) continue;

        let decoded = "";

        try {
            decoded = Buffer.from(tx.attachment, 'base64').toString();
        } catch { continue; }

        if (!decoded.startsWith(`VOTE:${proposal.id}`)) continue;

        const parts = decoded.split(":");
        const option = parts[2];
        const voter = tx.sender;

        if (voted.has(voter)) continue;

        const weight = snapshot[voter];
        if (!weight) continue;

        if (results[option] !== undefined) {
            results[option] += weight;
            voted.add(voter);
        }
    }

    res.json(results);
});

app.listen(PORT, () => {
    console.log(`NBX API running on port ${PORT}`);
});
