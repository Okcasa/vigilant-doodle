const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 10000;

// CORS configuration
app.use(cors());  // Allow all origins for testing

app.use(express.json());

let browser;

// Initialize browser on startup
async function initBrowser() {
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });
        console.log('[STARTUP] Browser initialized successfully');
    } catch (error) {
        console.error('[ERROR] Failed to initialize browser:', error);
    }
}

// Function to fetch transcript
async function fetchTranscript(videoId) {
    if (!browser) {
        await initBrowser();
    }

    const page = await browser.newPage();
    try {
        // Navigate to the transcript page
        await page.goto(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Click the more actions button
        await page.waitForSelector('button[aria-label="More actions"]');
        await page.click('button[aria-label="More actions"]');

        // Wait for and click the "Show transcript" button
        await page.waitForSelector('button[aria-label="Show transcript"]');
        await page.click('button[aria-label="Show transcript"]');

        // Wait for the transcript panel to load
        await page.waitForSelector('div[class*="segment-text"]');

        // Extract the transcript
        const transcript = await page.evaluate(() => {
            const segments = document.querySelectorAll('div[class*="segment-timestamp"], div[class*="segment-text"]');
            const transcript = [];
            let currentTime = 0;
            let currentText = '';

            for (let i = 0; i < segments.length; i += 2) {
                const timestamp = segments[i].textContent;
                const text = segments[i + 1]?.textContent || '';

                // Convert timestamp (mm:ss) to seconds
                const [minutes, seconds] = timestamp.split(':').map(Number);
                const startTime = minutes * 60 + seconds;

                transcript.push({
                    text: text.trim(),
                    start: startTime,
                    duration: i + 2 < segments.length ? 
                        (segments[i + 2]?.textContent.split(':').map(Number).reduce((m, s) => m * 60 + s) - startTime) : 
                        5 // Default duration for last segment
                });
            }

            return transcript;
        });

        return transcript;
    } catch (error) {
        console.error('[ERROR] Error in fetchTranscript:', error);
        throw new Error('Failed to fetch transcript: ' + error.message);
    } finally {
        await page.close();
    }
}

// API Routes
app.get('/api/transcript/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        console.log(`[DEBUG] Attempting to fetch transcript for video ID: ${videoId}`);

        if (!videoId || videoId.length !== 11) {
            console.error('[ERROR] Invalid video ID:', videoId);
            return res.status(400).json({
                error: 'Invalid video ID',
                details: 'Video ID must be 11 characters long'
            });
        }

        console.log('[DEBUG] Fetching transcript...');
        const transcript = await fetchTranscript(videoId);
        
        if (!transcript || transcript.length === 0) {
            console.error('[ERROR] No transcript found for video:', videoId);
            return res.status(404).json({
                error: 'No transcript available',
                details: 'No transcript was found for this video'
            });
        }

        console.log(`[SUCCESS] Fetched transcript with ${transcript.length} entries`);
        res.json(transcript);
    } catch (error) {
        console.error('[ERROR] Error fetching transcript:', {
            videoId: req.params.videoId,
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack
        });
        
        res.status(500).json({ 
            error: 'Failed to fetch transcript',
            message: error.message,
            name: error.name,
            details: 'Internal server error'
        });
    }
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

// Initialize browser and start server
initBrowser().then(() => {
    app.listen(PORT, () => {
        console.log(`[STARTUP] Server running on port ${PORT}`);
        console.log(`[STARTUP] Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}); 