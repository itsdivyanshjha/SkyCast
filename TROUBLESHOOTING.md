# SkyCast - MongoDB Atlas Troubleshooting Guide

## 🚨 Authentication Failed Error (Code 8000)

If you're seeing `MongoServerError: bad auth : Authentication failed` with `AtlasError`, follow this step-by-step guide:

### **1. Verify Your MongoDB Atlas Setup**

#### Create Database User
1. Log into [MongoDB Atlas](https://cloud.mongodb.com/)
2. Go to **Database Access** in the left sidebar
3. Click **"+ ADD NEW DATABASE USER"**
4. Choose **"Password"** authentication method
5. Create username/password (write these down!)
6. Set **Database User Privileges** to **"Read and write to any database"**
7. Click **"Add User"**

#### Whitelist Your IP Address
1. Go to **Network Access** in the left sidebar
2. Click **"+ ADD IP ADDRESS"**
3. Choose **"Add Current IP Address"** or **"Allow Access from Anywhere"** (for development)
4. Click **"Confirm"**

### **2. Get the Correct Connection String**

1. Go to **Database** in the left sidebar
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Select **"Node.js"** as driver
5. Copy the connection string - it should look like:
   ```
   mongodb+srv://username:password@cluster-name.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### **3. Update Your .env.local File**

```env
# Replace with YOUR actual values:
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.xxxxx.mongodb.net/skycast?retryWrites=true&w=majority

# Other required variables:
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweather_key
OPENROUTER_API_KEY=your_openrouter_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### **4. Common Mistakes to Avoid**

❌ **Don't do this:**
- Using `<username>` or `<password>` literally in the connection string
- Forgetting to add your IP address to the whitelist
- Using the wrong database name
- Special characters in password without URL encoding

✅ **Do this:**
- Replace `<username>` and `<password>` with actual values
- URL encode special characters in passwords
- Use the exact cluster name from Atlas
- Add `/skycast` at the end to specify the database name

### **5. Test Your Connection**

Create a simple test script to verify the connection:

```javascript
// test-db.js
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected successfully to MongoDB Atlas!');
    await client.close();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();
```

Run it with: `node test-db.js`

### **6. Alternative: Use Local MongoDB**

If Atlas continues to give issues, you can use local MongoDB for development:

```bash
# Install MongoDB locally (macOS with Homebrew)
brew install mongodb-community
brew services start mongodb-community

# Update .env.local to use local MongoDB
MONGODB_URI=mongodb://localhost:27017/skycast
```

### **7. Password Special Characters**

If your password contains special characters, URL encode them:

| Character | URL Encoded |
|-----------|-------------|
| @         | %40         |
| :         | %3A         |
| /         | %2F         |
| ?         | %3F         |
| #         | %23         |
| [         | %5B         |
| ]         | %5D         |

Example: `password@123` becomes `password%40123`

### **8. Restart Your Development Server**

After updating `.env.local`:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

---

## 🎯 **Quick Checklist**

- [ ] Created database user in Atlas
- [ ] Added IP address to whitelist  
- [ ] Copied correct connection string
- [ ] Replaced `<username>` and `<password>` with actual values
- [ ] Added `/skycast` database name to connection string
- [ ] URL encoded special characters in password
- [ ] Restarted development server

## 🆘 **Still Having Issues?**

If you're still getting authentication errors:

1. **Double-check the username/password** - create a new user if needed
2. **Try "Allow Access from Anywhere"** in Network Access temporarily
3. **Use a simple password** without special characters for testing
4. **Check Atlas cluster status** - make sure it's running (not paused)

## 🔄 **Fallback Option**

You can always fall back to local MongoDB for development and use Atlas only for production deployment. 