const express = require('express');
const cors = require('cors');
const getSubtitles = require('youtube-caption-scraper');

const app = express();
const PORT = process.env.PORT || 10000;

// CORS configuration
app.use(cors());  // Allow all origins for testing

app.use(express.json());

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

        console.log('[DEBUG] Calling getSubtitles...');
        const transcript = await getSubtitles({
            videoID: videoId,
            lang: 'en'  // Try forcing English
        });
        
        console.log('[DEBUG] Raw transcript response:', JSON.stringify(transcript));

        if (!transcript || transcript.length === 0) {
            console.error('[ERROR] No transcript found for video:', videoId);
            return res.status(404).json({
                error: 'No transcript available',
                details: 'No transcript was found for this video'
            });
        }

        // Transform the response to match our expected format
        const formattedTranscript = transcript.map(item => ({
            text: item.text,
            start: item.start,
            duration: item.dur
        }));

        console.log(`[SUCCESS] Fetched transcript with ${formattedTranscript.length} entries`);
        res.json(formattedTranscript);
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

app.listen(PORT, () => {
    console.log(`[STARTUP] Server running on port ${PORT}`);
    console.log(`[STARTUP] Environment: ${process.env.NODE_ENV || 'development'}`);
}); 