# tuco Parents Circle - Deployment Checklist

## ✅ Current Status: READY FOR DEPLOYMENT

The app has been fully rebuilt with:
- ✅ Real JWT authentication (bcryptjs + jsonwebtoken)
- ✅ PostgreSQL database via Prisma ORM
- ✅ Express backend with proper API endpoints
- ✅ Real email sending capability (Resend)
- ✅ All TypeScript errors resolved
- ✅ Production build successful

---

## 📋 What You Need from Render

### 1. **Database (Neon PostgreSQL)**
   - Go to https://neon.tech
   - Sign up for free account
   - Create a new project named `tuco-parents-circle`
   - Copy the connection string (looks like: `postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require`)
   - This string will be your `DATABASE_URL` environment variable

### 2. **Render Web Service (Backend + Frontend)**
   - Go to https://render.com
   - Sign up / Log in
   - Connect your GitHub repository
   - Create new Web Service:
     - **Name**: `tuco-parents-circle`
     - **Region**: Singapore (closest to India)
     - **Branch**: `main`
     - **Build Command**: `npm install && npm run build && npx prisma generate && npx prisma db push`
     - **Start Command**: `NODE_ENV=production tsx server/index.ts`
     - **Instance Type**: Free (or Starter if Free is unavailable)

### 3. **Environment Variables to Add in Render**

Set these in Render Web Service → Environment:

```
NODE_ENV=production
PORT=3002
DATABASE_URL=postgresql://user:password@ep-xxxxx.neon.tech/neondb?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ANTHROPIC_API_KEY=sk-ant-v0-xxxxx  (optional, for AI chatbot)
RESEND_API_KEY=re_xxxxx  (optional, for real emails)
EMAIL_FROM=noreply@yourdomain.com  (optional, for real emails)
FRONTEND_URL=https://tuco-parents-circle.onrender.com
```

---

## 🔑 How to Get Each Secret

### **JWT_SECRET**
- Generate a random string (at least 32 characters)
- Linux/Mac: `openssl rand -base64 32`
- Windows: Use any random string generator
- Example: `aB3xYz9mP7qR2wLkJ4nD6sT8uV0wXyZa`

### **ANTHROPIC_API_KEY** (Optional - for AI Chat)
- Go to https://console.anthropic.com
- Sign up and get free $5 credit
- Create an API key in the console
- Starts with `sk-ant-v0-`

### **RESEND_API_KEY** (Optional - for real emails)
- Go to https://resend.com
- Sign up for free
- Create an API key
- Get 3,000 emails/month free
- Starts with `re_`

---

## 📝 Setup Steps

### Step 1: Prepare Database
```bash
# 1. In your local machine, update .env with Neon DATABASE_URL
DATABASE_URL="postgresql://user:password@ep-xxxxx.neon.tech/neondb?sslmode=require"

# 2. Run migration to create tables
npx prisma db push

# 3. Your database is now ready
```

### Step 2: Deploy to Render
1. Go to Render Dashboard
2. Click "New +"
3. Select "Web Service"
4. Connect your GitHub repo
5. Fill in the form above
6. Add all Environment Variables
7. Click "Deploy Web Service"
8. Wait 2-3 minutes for build to complete

### Step 3: Test the Deployment
1. Go to `https://tuco-parents-circle.onrender.com`
2. Try creating an account
3. Try creating a post
4. Try voting/liking
5. Check moderation dashboard if you login as moderator

---

## 🧪 Testing Before Production

### Local Testing
```bash
# Build the app
npm run build

# Start server in production mode (from project root)
NODE_ENV=production DATABASE_URL="..." ANTHROPIC_API_KEY="..." tsx server/index.ts

# Open browser to http://localhost:3002
```

### What to Test
- [ ] Sign up works
- [ ] Login works
- [ ] Create a post
- [ ] Add a reply to a post
- [ ] Vote/upvote on a post
- [ ] Like a reply
- [ ] Save a post
- [ ] Moderation dashboard (login as mod)
- [ ] Chat with AI bot (if ANTHROPIC_API_KEY is set)
- [ ] User badges appear (after posting multiple times)
- [ ] Trust score updates

---

## ⚙️ How Everything Works

### Authentication Flow
1. User signs up → `api.signup(email, password, username, city, childAge)`
2. Backend hashes password with bcrypt → stores in database
3. Backend generates JWT token → sends back to frontend
4. Frontend stores token in localStorage
5. All future requests include `Authorization: Bearer <token>` header
6. Backend validates JWT on protected routes

### Data Flow
1. Frontend calls API endpoints (e.g., `POST /api/conversations`)
2. Backend validates JWT token
3. Backend checks user permissions (is user authenticated? is moderator?)
4. Backend executes database query via Prisma ORM
5. Backend returns JSON response
6. Frontend updates local state

### Database
- PostgreSQL on Neon
- Prisma ORM handles all queries
- Tables: Users, Conversations, Replies, Votes, Notifications, ChatSessions, etc.
- Auto-generates tables from `prisma/schema.prisma`

---

## 🚨 Important Notes

1. **First Deploy Will Take 5-10 Minutes**
   - Building the app
   - Creating database tables
   - Running migrations
   - Be patient!

2. **Free Tier Limitations**
   - Render free tier: Spins down after 15 min of inactivity (first request takes 30s to wake up)
   - Neon free tier: 1GB storage, no expiration
   - ANTHROPIC_API_KEY: $5 free credit (~500,000 tokens)
   - RESEND_API_KEY: 3,000 emails/month free

3. **If Build Fails**
   - Check the build logs in Render dashboard
   - Common issues:
     - Database connection string incorrect
     - Environment variable typo
     - Missing dependency
   - Contact support if stuck

4. **After Deployment**
   - Users can now sign up and use the app
   - Data persists in PostgreSQL database
   - All votes, posts, replies are saved permanently
   - Can access admin dashboard at `/` if logged in as mod

---

## 📞 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connection refused" on database | Check DATABASE_URL is correct and Neon project is active |
| "JWT_SECRET is required" | Add JWT_SECRET to Render environment variables |
| Build fails with "Cannot find module" | Make sure all dependencies are in package.json (run `npm install` locally first) |
| Emails not sending | RESEND_API_KEY is optional - without it, emails are logged to console |
| Chatbot not working | ANTHROPIC_API_KEY is optional - without it, uses keyword fallback |
| Page shows "Connection Error" | Backend is down - check Render logs, or restart web service |

---

## 🎯 Success Checklist

- [ ] Neon database is created
- [ ] Render web service is created
- [ ] All environment variables are set in Render
- [ ] Build succeeded (check Render logs)
- [ ] App is accessible at `https://tuco-parents-circle.onrender.com`
- [ ] Sign up works
- [ ] Login works
- [ ] Can create posts and replies
- [ ] Data persists after refresh
- [ ] Moderation dashboard works (login as moderator with `@mod.com` email)

---

## 💾 Backup & Restore

Your data is stored in Neon PostgreSQL. To backup:
```bash
# 1. Create a backup in Neon dashboard (automatic daily)
# 2. Export data using Neon CLI:
neon projects branch backup

# 3. To restore:
# Contact Neon support or restore from branch
```

---

## 🎉 You're Done!

Your complete forum is now live at `https://tuco-parents-circle.onrender.com`

Users can:
- Create accounts with real password hashing
- Post discussions by category
- Reply to discussions
- Vote and like posts
- Earn badges
- Chat with AI assistant
- See their moderation status
- All data persists in PostgreSQL
