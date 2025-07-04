# 🚄 Railway Deployment Guide

## **Step-by-Step Railway Deployment:**

### 1. **Go to Railway**
- Visit: https://railway.app/
- Login/Signup with GitHub

### 2. **Create New Project**
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose: `Ranjith-H7/backend`

### 3. **Configure Environment Variables**
In Railway dashboard, go to your project → Variables tab and add:

```
MONGO_URI=mongodb+srv://ranjith360set:ranjith360set@cluster0.dssnbmo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
NODE_ENV=production
PORT=5001
JWT_SECRET=your_jwt_secret_here
```

### 4. **Deploy Settings**
- **Start Command**: `npm start`
- **Build Command**: `npm install` (automatic)
- **Port**: Railway will automatically assign and map to your PORT=5001

### 5. **Domain Setup**
- Railway will provide a domain like: `your-project.railway.app`
- You can also add a custom domain if needed

## **Expected Deployment Result:**

### **Your API Endpoints Will Be:**
```
https://your-project.railway.app/health
https://your-project.railway.app/api/assets
https://your-project.railway.app/api/auth/register
https://your-project.railway.app/api/auth/login
https://your-project.railway.app/api/portfolio/:userId
https://your-project.railway.app/api/next-update
```

### **Logs Should Show:**
```
🚀 Server starting up...
🌟 Server running on port 5001
📦 Mongoose connected to MongoDB
🌟 MongoDB connected successfully
✅ Assets initialized successfully
🎯 Initial portfolio sync completed
```

## **Troubleshooting:**
- If deployment fails, check the Railway logs
- Ensure all environment variables are set correctly
- MongoDB Atlas IP whitelist should include `0.0.0.0/0`

## **Alternative: Manual Deployment**
If you prefer other platforms:
- **Render**: Connect GitHub repo + set environment variables
- **Vercel**: Use serverless functions (modify for serverless)
- **Heroku**: `git push heroku main` + set config vars
