# Backend Server

This is the backend server for the YouTube transcript extraction service.

## Security Notice

⚠️ **IMPORTANT**: Never commit your `.env` file or expose your API keys in the code. The `.env` file is already in `.gitignore` to prevent accidental commits.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
APIFY_API_KEY=your_apify_api_key_here
PORT=10000
NODE_ENV=development
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

## Production Deployment (EC2)

1. SSH into your EC2 instance:
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

2. Clone the repository and navigate to the backend directory:
```bash
cd backend
```

3. Create a `.env` file with your production environment variables:
```bash
echo "APIFY_API_KEY=your_apify_api_key_here" > .env
echo "PORT=10000" >> .env
echo "NODE_ENV=production" >> .env
```

4. Make the deployment script executable:
```bash
chmod +x deploy.sh
```

5. Run the deployment script:
```bash
./deploy.sh
```

## PM2 Commands

- View logs: `pm2 logs backend`
- Monitor application: `pm2 monit`
- Restart application: `pm2 restart backend`
- Stop application: `pm2 stop backend`
- View status: `pm2 status`

## API Endpoints

- `GET /api/transcript/:videoId` - Get transcript for a YouTube video
- `GET /health` - Health check endpoint

## Error Handling

The server includes comprehensive error handling and logging. Check the `logs` directory for detailed logs.

## Security Best Practices

1. Never commit `.env` files to version control
2. Use environment variables for all sensitive information
3. Regularly rotate API keys
4. Use HTTPS in production
5. Implement rate limiting (already configured)
6. Monitor logs for suspicious activity 