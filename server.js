const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');

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

        console.log('[DEBUG] Fetching video info...');
        const videoInfo = await ytdl.getInfo(videoId);
        
        // Get captions from video info
        const captions = videoInfo.player_response.captions;
        if (!captions || !captions.playerCaptionsTracklistRenderer) {
            console.error('[ERROR] No captions available for video:', videoId);
            return res.status(404).json({
                error: 'No transcript available',
                details: 'This video does not have captions'
            });
        }

        // Get English captions or the first available caption track
        const captionTracks = captions.playerCaptionsTracklistRenderer.captionTracks;
        const englishTrack = captionTracks.find(track => 
            track.languageCode === 'en' || 
            track.vssId.includes('.en')
        ) || captionTracks[0];

        if (!englishTrack) {
            console.error('[ERROR] No suitable caption track found:', videoId);
            return res.status(404).json({
                error: 'No transcript available',
                details: 'Could not find suitable captions for this video'
            });
        }

        // Fetch the actual transcript
        const response = await fetch(englishTrack.baseUrl);
        const xml = await response.text();
        
        // Parse the XML to get transcript entries
        const transcript = xml
            .match(/<text[^>]*>[^<]*<\/text>/g)
            .map(item => {
                const start = parseFloat(item.match(/start="([^"]+)"/)[1]);
                const duration = parseFloat(item.match(/dur="([^"]+)"/)[1]);
                const text = item
                    .match(/>([^<]*)</)[1]
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'");
                
                return {
                    text,
                    start,
                    duration
                };
            });

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

app.listen(PORT, () => {
    console.log(`[STARTUP] Server running on port ${PORT}`);
    console.log(`[STARTUP] Environment: ${process.env.NODE_ENV || 'development'}`);
}); 