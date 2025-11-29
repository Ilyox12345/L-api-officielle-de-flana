export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // ROUTE : compteur de vues
        if (url.pathname === "/views") {
            return handleViews(env);
        }

        // ROUTE : ajouter un score
        if (url.pathname === "/score" && request.method === "POST") {
            return handleScore(request, env);
        }

        // ROUTE : récupérer le leaderboard
        if (url.pathname === "/leaderboard") {
            return handleLeaderboard(env);
        }

        return new Response("Not found", { status: 404 });
    }
};


// -----------------------------
// 📌 GESTION DES VUES
// -----------------------------
async function handleViews(env) {
    const key = "total-views";

    let current = await env.DB.get(key);
    let views = current ? parseInt(current) : 0;

    views++;

    await env.DB.put(key, views.toString());

    return json({ views });
}


// -----------------------------
// 📌 GESTION DES SCORES
// -----------------------------
async function handleScore(request, env) {
    const body = await request.json();
    const username = body.username;
    const score = body.score;

    if (!username || typeof score !== "number") {
        return json({ error: "Missing username or score" }, 400);
    }

    const playerKey = `player-${username}`;
    const scoreKey = `score-${Date.now()}`;

    // Récup meilleur score du joueur
    let best = await env.DB.get(playerKey);
    let bestScore = best ? parseInt(best) : 0;

    // Nouveau meilleur ?
    if (score > bestScore) {
        await env.DB.put(playerKey, score.toString());
        bestScore = score;
    }

    // Sauvegarder score global pour le leaderboard
    const entry = JSON.stringify({
        username,
        score,
        timestamp: Date.now()
    });

    await env.DB.put(scoreKey, entry);

    return json({
        username,
        score,
        bestScore
    });
}


// -----------------------------
// 📌 LEADERBOARD TOP 10
// -----------------------------
async function handleLeaderboard(env) {
    const list = await env.DB.list({ prefix: "score-" });

    const scores = [];

    for (const k of list.keys) {
        const raw = await env.DB.get(k.name);
        if (!raw) continue;

        try {
            scores.push(JSON.parse(raw));
        } catch {}
    }

    // Trier du plus grand au plus petit
    scores.sort((a, b) => b.score - a.score);

    // Retourner top 10
    return json(scores.slice(0, 10));
}


// -----------------------------
// 📌 Helper JSON
// -----------------------------
function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: {
            "Content-Type": "application/json"
        }
    });
}
