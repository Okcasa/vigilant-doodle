require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { ApifyClient } = require('apify-client');
const rateLimit = require('express-rate-limit');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 10000;

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://localhost:5000',
        'http://localhost:8000',
        'http://localhost:10000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5000',
        'http://127.0.0.1:8000',
        'http://127.0.0.1:10000',
        // Add your frontend domain here
        'http://18.206.146.89:10000'
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Initialize Apify client
const apifyClient = new ApifyClient({
    token: process.env.APIFY_API_KEY,
    maxRetries: 8,
    minDelayBetweenRetriesMillis: 500,
    timeoutSecs: 360
});

app.set('trust proxy', 1); // Trust first proxy (Nginx)
app.use(limiter);
app.use(cors({
    origin: '*', // Allow all origins; for production, specify your frontend URL
}));
app.use(express.json());

// API Routes
app.get('/api/transcript/:videoId', async (req, res) => {
    try {
        const videoId = req.params.videoId;
        console.log('Fetching transcript for video:', videoId);

        // Prepare input for the YouTube transcript scraper actor
        const input = {
            videoUrls: [`https://www.youtube.com/watch?v=${videoId}`],
            maxResults: 1
        };

        // Run the actor and wait for it to finish
        const run = await apifyClient.actor("L57jETyu9qT6J7bs5").call(input, {
            waitSecs: 60 // Wait up to 60 seconds for the run to finish
        });

        // Fetch results from the dataset
        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        console.log('Apify run result:', items); // Log the full Apify response

        if (!items || items.length === 0 || !items[0].transcript) {
            throw new Error('No transcript available for this video');
        }

        res.json(items[0].transcript);
    } catch (error) {
        console.error('Error fetching transcript:', error);
        res.status(500).json({ 
            error: 'Failed to fetch transcript',
            message: error.message 
        });
    }
});

// POST endpoint using curl for Apify API
app.post('/api/transcript-curl', async (req, res) => {
    const { videoUrl } = req.body;
    if (!videoUrl) {
        return res.status(400).json({ error: 'Missing videoUrl' });
    }
    const apiToken = process.env.APIFY_API_KEY;
    const inputJson = JSON.stringify({ videoUrls: [videoUrl] });
    // Write input.json to disk
    const fs = require('fs');
    fs.writeFileSync('input.json', inputJson);
    const curlCmd = `curl "https://api.apify.com/v2/acts/L57jETyu9qT6J7bs5/runs?token=${apiToken}" -X POST -d @input.json -H 'Content-Type: application/json'`;
    exec(curlCmd, (error, stdout, stderr) => {
        if (error) {
            console.error('curl error:', error);
            return res.status(500).json({ error: 'Failed to start Apify actor', details: stderr });
        }
        try {
            const runData = JSON.parse(stdout);
            const runId = runData.data.id;
            // Poll for results (simple version, not production-grade)
            const pollCmd = `curl "https://api.apify.com/v2/actor-runs/${runId}?token=${apiToken}"`;
            let attempts = 0;
            const poll = () => {
                exec(pollCmd, (pollErr, pollStdout) => {
                    if (pollErr) {
                        return res.status(500).json({ error: 'Polling error', details: pollErr });
                    }
                    const pollData = JSON.parse(pollStdout);
                    if (pollData.data.status === 'SUCCEEDED') {
                        // Get output
                        const outputCmd = `curl "https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiToken}"`;
                        exec(outputCmd, (outErr, outStdout) => {
                            if (outErr) {
                                return res.status(500).json({ error: 'Output fetch error', details: outErr });
                            }
                            try {
                                const output = JSON.parse(outStdout);
                                if (output[0] && output[0].transcript) {
                                    return res.json(output[0].transcript);
                                } else {
                                    return res.status(404).json({ error: 'Transcript not found in output' });
                                }
                            } catch (parseErr) {
                                return res.status(500).json({ error: 'Output parse error', details: parseErr });
                            }
                        });
                    } else if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(pollData.data.status)) {
                        return res.status(500).json({ error: 'Apify actor failed', status: pollData.data.status });
                    } else if (attempts++ < 30) {
                        setTimeout(poll, 1000);
                    } else {
                        return res.status(504).json({ error: 'Timed out waiting for Apify actor' });
                    }
                });
            };
            poll();
        } catch (parseErr) {
            return res.status(500).json({ error: 'Run parse error', details: parseErr });
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[ERROR] Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
        details: 'An unexpected error occurred'
    });
});

app.listen(PORT, () => {
    console.log(`[STARTUP] Server running on port ${PORT}`);
    console.log(`[STARTUP] Environment: ${process.env.NODE_ENV || 'development'}`);
}); 