// Health check endpoint for Vercel
module.exports = async (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'API server is running',
    endpoints: ['/api/authenticate', '/api/orderrows', '/api/orders']
  });
};
