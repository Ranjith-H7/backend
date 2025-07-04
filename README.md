# Stock Market Backend API

Node.js Express backend for the Stock Market Trading App.

## Setup

```bash
npm install
npm start
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```
MONGO_URI=your_mongodb_connection_string
PORT=5001
NODE_ENV=production
```

### MongoDB Connection Examples:
- Local: `mongodb://localhost:27017/stockmarket`
- MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/stockmarket?retryWrites=true&w=majority`

## Deploy to Render/Railway

1. Connect this GitHub repo
2. Set environment variables
3. Deploy with Node.js environment

## API Endpoints

- `GET /health` - Health check with database status
- `GET /api/assets` - Get all assets
- `GET /api/portfolio/:userId` - Get user portfolio
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

## Troubleshooting

### MongoDB Connection Timeout
If you see "Operation `assets.find()` buffering timed out":

1. **Check MongoDB URI**: Ensure your `MONGO_URI` is correct
2. **Network Issues**: MongoDB Atlas may have IP whitelist restrictions
3. **Database Status**: Visit `/health` endpoint to check connection status
4. **Timeout Settings**: The app has 30-second connection timeouts built-in

### Common Solutions:
- Add `0.0.0.0/0` to MongoDB Atlas IP whitelist for testing
- Use a reliable MongoDB hosting service
- Check database credentials and cluster status

## Development

```bash
npm run dev  # Run with nodemon
```
