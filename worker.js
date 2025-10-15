// worker.js - Cloudflare Worker to keep your website awake
const WEBSITE_URL = 'https://focus-flow-lopn.onrender.com/'; 
export default {
  async scheduled(event, env, ctx) {
    console.log(`🚀 Keep-alive worker triggered at ${new Date().toISOString()}`);
    
    try {
      const response = await fetch(WEBSITE_URL, {
        headers: {
          'User-Agent': 'Cloudflare-Keep-Alive-Bot/1.0',
        },
      });
      console.log(`✅ Successfully pinged ${WEBSITE_URL} - Status: ${response.status}`);
    } catch (error) {
      console.log(`❌ Failed to ping ${WEBSITE_URL} - Error: ${error.message}`);
    }
  },

  // Optional: Handle HTTP requests for testing
  async fetch(request, env, ctx) {
    return new Response('Keep-alive worker is running! Visit Cloudflare dashboard to configure cron triggers.');
  }
};
