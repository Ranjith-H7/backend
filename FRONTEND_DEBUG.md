# 🔍 Frontend-Backend Connection Troubleshooting

## **Current Backend Status:** ✅ Working
- Database: Connected
- Price Updates: Running every 10 minutes
- User Portfolios: Updating successfully

## **Common Frontend Issues & Solutions:**

### 1. **Wrong API URL**
Check your frontend environment variables:
```javascript
// Frontend should use:
const API_URL = 'https://your-railway-app.railway.app'
// or
const API_URL = 'https://backend-4yki.onrender.com'
```

### 2. **CORS Issues**
Your backend now supports these origins:
- `localhost:3000` (React dev)
- `localhost:5173` (Vite dev) 
- `*.vercel.app` (Vercel deployments)
- `*.railway.app` (Railway deployments)
- `*.render.com` (Render deployments)

### 3. **Test Endpoints**
Try these URLs in your browser first:

#### **Test Backend Connection:**
```
https://your-backend-url/api/test
Expected: {"message": "Backend is working!", ...}
```

#### **Test Health:**
```
https://your-backend-url/health
Expected: {"server": "running", "database": "connected", ...}
```

#### **Test Assets:**
```
https://your-backend-url/api/assets
Expected: [{"_id": "...", "name": "TCS", "price": 4000.85, ...}, ...]
```

## **Frontend Code Example:**

### **React/Next.js API Call:**
```javascript
// In your frontend code
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-backend-url';

const fetchAssets = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/assets`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Assets:', data);
    return data;
  } catch (error) {
    console.error('Error fetching assets:', error);
    return [];
  }
};
```

### **Environment Variables for Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=https://your-backend-url
```

## **Debugging Steps:**

1. **Open Browser DevTools**
   - Go to Network tab
   - Try to load your frontend
   - Check for failed API calls
   - Look for CORS errors in Console

2. **Check API Response**
   - Visit backend URLs directly in browser
   - Ensure they return JSON data

3. **Verify Environment Variables**
   - Make sure frontend has correct backend URL
   - Check both development and production configs

## **Common Error Messages & Solutions:**

### **"Access to fetch blocked by CORS"**
✅ **Fixed**: Updated backend CORS configuration

### **"Failed to fetch"**
❌ **Check**: Wrong API URL or network issues

### **"Unexpected token < in JSON"**
❌ **Check**: Backend returning HTML instead of JSON (likely 404/500 error)

### **Blank page with no errors**
❌ **Check**: Frontend not calling backend APIs or API calls failing silently
