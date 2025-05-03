const express = require('express');
const cors = require('cors');
const { YoutubeTranscript } = require('youtube-transcript');

const app = express();
const PORT = process.env.PORT || 10000;

// CORS configuration: allow only Cloudflare Pages and localhost
app.use(cors({
    origin: [
        'https://youscriptt.pages.dev', // Cloudflare Pages frontend
        'http://localhost:3000',        // Local frontend
        'http://localhost:10000'        // Local backend
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));

app.use(express.json());

// API Routes
app.get('/api/transcript/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        console.log(`Attempting to fetch transcript for video ID: ${videoId}`);

        if (!videoId || videoId.length !== 11) {
            console.error('Invalid video ID:', videoId);
            return res.status(400).json({
                error: 'Invalid video ID',
                details: 'Video ID must be 11 characters long'
            });
        }

        console.log('Calling YoutubeTranscript.fetchTranscript...');
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        
        if (!transcript || transcript.length === 0) {
            console.error('No transcript found for video:', videoId);
            return res.status(404).json({
                error: 'No transcript available',
                details: 'No transcript was found for this video'
            });
        }

        console.log(`Successfully fetched transcript with ${transcript.length} entries`);
        res.json(transcript);
    } catch (error) {
        console.error('Error fetching transcript:', {
            videoId: req.params.videoId,
            error: error.message,
            stack: error.stack
        });
        
        // Send appropriate error response
        if (error.message.includes('Could not find any transcript')) {
            res.status(404).json({
                error: 'Transcript not found',
                message: 'No transcript is available for this video'
            });
        } else {
            res.status(500).json({ 
                error: 'Failed to fetch transcript',
                message: error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
            });
        }
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
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 