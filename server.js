require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Helper function to extract video ID
function extractVideoId(url) {
    if (!url) return null;
    const trimmed = url.trim();
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})(?:[?&]|$)/,
        /youtube\.com\/watch\?.*v=([^&]+)/,
        /m\.youtube\.com\/watch\?v=([^&]+)/
    ];
    for (let pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match && match[1] && match[1].length >= 11) {
            return match[1].substring(0, 11);
        }
    }
    return null;
}

// Thumbnail quality presets
const THUMBNAIL_QUALITIES = [
    { name: 'Maxres (Full HD)', code: 'maxresdefault', size: '1920x1080', quality: '1080p Best' },
    { name: 'SD High Quality', code: 'sddefault', size: '640x480', quality: 'SD 480p' },
    { name: 'HQ Medium', code: 'hqdefault', size: '480x360', quality: 'HQ 360p' },
    { name: 'MQ Standard', code: 'mqdefault', size: '320x180', quality: 'MQ 180p' },
    { name: 'Default Low', code: 'default', size: '120x90', quality: 'LQ 90p' }
];

// Routes
app.get('/', (req, res) => {
    res.render('pages/index', {
        title: 'YouTube Thumbnail Downloader - Download HD Thumbnails for Free',
        qualities: THUMBNAIL_QUALITIES,
        videoData: null,
        error: null
    });
});

app.post('/get-thumbnails', async (req, res) => {
    const { videoUrl } = req.body;
    
    if (!videoUrl) {
        return res.render('pages/index', {
            title: 'YouTube Thumbnail Downloader',
            qualities: THUMBNAIL_QUALITIES,
            videoData: null,
            error: 'Please enter a YouTube URL'
        });
    }

    const videoId = extractVideoId(videoUrl);
    
    if (!videoId) {
        return res.render('pages/index', {
            title: 'YouTube Thumbnail Downloader',
            qualities: THUMBNAIL_QUALITIES,
            videoData: null,
            error: 'Invalid YouTube URL. Please check and try again.'
        });
    }

    try {
        // Fetch video metadata
        const oembedResponse = await axios.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        
        const videoData = {
            id: videoId,
            title: oembedResponse.data.title,
            author: oembedResponse.data.author_name,
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            qualities: THUMBNAIL_QUALITIES.map(q => ({
                ...q,
                url: `https://img.youtube.com/vi/${videoId}/${q.code}.jpg`
            }))
        };

        res.render('pages/index', {
            title: 'YouTube Thumbnail Downloader',
            qualities: THUMBNAIL_QUALITIES,
            videoData: videoData,
            error: null
        });
        
    } catch (error) {
        console.error('Error fetching video info:', error);
        res.render('pages/index', {
            title: 'YouTube Thumbnail Downloader',
            qualities: THUMBNAIL_QUALITIES,
            videoData: null,
            error: 'Failed to fetch video information. Please try again.'
        });
    }
});

// API endpoint for AJAX requests
app.get('/api/thumbnails', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    const videoId = extractVideoId(url);
    
    if (!videoId) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    try {
        const oembedResponse = await axios.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        
        const qualities = THUMBNAIL_QUALITIES.map(q => ({
            name: q.name,
            code: q.code,
            size: q.size,
            quality: q.quality,
            url: `https://img.youtube.com/vi/${videoId}/${q.code}.jpg`
        }));

        res.json({
            success: true,
            videoId: videoId,
            title: oembedResponse.data.title,
            author: oembedResponse.data.author_name,
            thumbnails: qualities
        });
        
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Failed to fetch thumbnails' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});