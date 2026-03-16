const path = require('path');
const gtts = require('node-gtts')('zh-cn'); // Default to Chinese TTS

class TTSService {

    /**
     * Converts text into an audio file stream directly into the express response
     * @param {string} text - The Chinese text to be spoken
     * @param {Object} res - The Express response object to stream audio back directly
     */
    async streamAudio(text, res) {
        return new Promise((resolve, reject) => {
            try {
                // Set headers so the browser knows it's receiving an audio file
                res.setHeader('Content-Type', 'audio/mpeg');
                res.setHeader('Content-Disposition', 'inline; filename="pronunciation.mp3"');
                res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for a year

                gtts.stream(text)
                    .on('error', (err) => {
                        console.error('[TTS Service] Streaming Error:', err);
                        reject(err);
                    })
                    .pipe(res)
                    .on('finish', () => resolve());
            } catch (error) {
                console.error('[TTS Service] Failed to generate TTS audio:', error);
                reject(error);
            }
        });
    }

}

module.exports = new TTSService();
