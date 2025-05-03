const { YoutubeTranscript } = require('youtube-transcript');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { videoId } = req.query;
    if (!videoId) {
        res.status(400).json({ error: 'Missing videoId parameter' });
        return;
    }

    try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        res.status(200).json(transcript);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch transcript',
            message: error.message
        });
    }
}; 