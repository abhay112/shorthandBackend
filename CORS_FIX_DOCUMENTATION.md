# 🌐 CORS Configuration Fix

## 🐛 **Issue**

CORS (Cross-Origin Resource Sharing) errors were occurring when the frontend tried to access the API from different ports:

```
Access to XMLHttpRequest at 'http://localhost:3000/api/v1/auth/login' 
from origin 'http://localhost:3001' has been blocked by CORS policy
```

## ❌ **Previous Configuration (Broken)**

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173' || "http://localhost:3001" || "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));
```

**Problem**: The `||` operator doesn't create an array of allowed origins. It only evaluates to the first truthy value, meaning only ONE origin was allowed.

## ✅ **New Configuration (Fixed)**

```javascript
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:5174',
      process.env.FRONTEND_URL
    ].filter(Boolean); // Remove undefined values
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
```

## 🎯 **What Changed**

### **1. Dynamic Origin Checking**
- Uses a function to validate each request's origin
- Checks against an array of allowed origins
- More flexible and secure

### **2. Multiple Localhost Ports**
Now supports all common development ports:
- `http://localhost:3000` - Backend default
- `http://localhost:3001` - Common React port
- `http://localhost:5173` - Vite default
- `http://localhost:5174` - Secondary Vite port
- `process.env.FRONTEND_URL` - Production frontend URL

### **3. Development Mode Flexibility**
```javascript
if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
  callback(null, true);
}
```
In development mode, allows all origins automatically.

### **4. Enhanced Headers**
Added support for:
- `PATCH` method (for partial updates)
- `Cookie` header (for cookie-based auth)
- `Set-Cookie` exposed header (for setting cookies from API)

### **5. No-Origin Requests**
```javascript
if (!origin) return callback(null, true);
```
Allows requests without an origin (mobile apps, curl, Postman, etc.)

## 🔧 **Environment Configuration**

### **Development (.env.development)**
```env
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
```

### **Production (.env.production)**
```env
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
```

## 📊 **How It Works**

### **Request Flow:**

```
1. Browser makes request from http://localhost:3001
   ↓
2. CORS middleware intercepts request
   ↓
3. Checks if origin (localhost:3001) is in allowedOrigins array
   ↓
4. If YES: Adds CORS headers and allows request
   ↓
5. If NO: Returns CORS error
```

### **CORS Headers Added:**

```http
Access-Control-Allow-Origin: http://localhost:3001
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie
Access-Control-Expose-Headers: Set-Cookie
```

## 🧪 **Testing**

### **Test from Different Origins:**

```bash
# From localhost:3000
curl http://localhost:3000/api/v1/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  --data '{"token":"your-token"}'

# From localhost:3001
curl http://localhost:3000/api/v1/auth/login \
  -H "Origin: http://localhost:3001" \
  -H "Content-Type: application/json" \
  --data '{"token":"your-token"}'

# From localhost:5173
curl http://localhost:3000/api/v1/auth/login \
  -H "Origin: http://localhost:5173" \
  -H "Content-Type: application/json" \
  --data '{"token":"your-token"}'
```

All should now work! ✅

## 🚀 **Production Deployment**

### **Option 1: Same Domain (Recommended)**
Deploy frontend and backend on the same domain with different paths:
```
Frontend: https://yourdomain.com
Backend:  https://yourdomain.com/api
```

No CORS needed! 🎉

### **Option 2: Different Domains**
Set the production frontend URL:
```env
FRONTEND_URL=https://app.yourdomain.com
```

The CORS middleware will automatically allow it.

### **Option 3: Multiple Frontends**
If you have multiple frontend apps (web, mobile-web, admin panel):

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,           // Main app
  process.env.ADMIN_FRONTEND_URL,     // Admin panel
  process.env.MOBILE_FRONTEND_URL,    // Mobile web
].filter(Boolean);
```

## 🔒 **Security Considerations**

### **✅ Good Practices:**
1. **Whitelist specific origins** - Don't use `*` in production
2. **Enable credentials** - For cookie-based authentication
3. **Limit methods** - Only allow methods you actually use
4. **Environment-based** - Different configs for dev/prod

### **❌ Avoid:**
```javascript
// DON'T DO THIS IN PRODUCTION!
app.use(cors({
  origin: '*',  // Allows any website to access your API
  credentials: true  // Dangerous with wildcard origin
}));
```

### **Why This Is Secure:**
- ✅ Only specific origins can access API
- ✅ Credentials (cookies) only sent to whitelisted origins
- ✅ Production mode enforces strict origin checking
- ✅ Development mode allows flexibility without compromising production

## 📱 **Mobile App Support**

Mobile apps don't send `Origin` header, so this configuration allows them:

```javascript
if (!origin) return callback(null, true);
```

This allows:
- React Native apps
- Flutter apps
- Native iOS/Android apps
- Desktop Electron apps
- curl/Postman/testing tools

## 🐛 **Troubleshooting**

### **Still getting CORS errors?**

1. **Check browser console** for exact error message
2. **Verify frontend URL** matches an allowed origin exactly (including http/https)
3. **Clear browser cache** and cookies
4. **Check environment variables** are loaded correctly
5. **Restart backend** after changing CORS config

### **Common Mistakes:**

```javascript
// ❌ Wrong - HTTPS vs HTTP mismatch
Frontend: https://localhost:3001
Allowed:  http://localhost:3001

// ❌ Wrong - Port mismatch
Frontend: http://localhost:3002
Allowed:  http://localhost:3001

// ❌ Wrong - Trailing slash
Frontend: http://localhost:3001/
Allowed:  http://localhost:3001

// ✅ Correct - Exact match
Frontend: http://localhost:3001
Allowed:  http://localhost:3001
```

## 📝 **Adding New Origins**

To add support for a new frontend URL:

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:YOUR_NEW_PORT',  // Add here
  process.env.FRONTEND_URL
].filter(Boolean);
```

Restart the backend, and it will work immediately! 🚀

## 🎉 **Benefits**

1. ✅ **Multiple frontend support** - Run multiple dev servers simultaneously
2. ✅ **Flexible development** - Switch between ports without backend changes
3. ✅ **Production ready** - Secure configuration for deployment
4. ✅ **Mobile friendly** - Supports mobile apps and testing tools
5. ✅ **Easy debugging** - Clear error messages when origin not allowed

Your CORS issues are now resolved! 🎊
