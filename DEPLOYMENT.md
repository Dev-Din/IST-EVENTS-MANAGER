# 🚀 Vercel Deployment Guide for Event Organizing System

## Prerequisites

- GitHub account
- MongoDB Atlas account (free)
- Vercel account (free)

## Step 1: Prepare Your Repository

1. Push your code to GitHub
2. Make sure all files are committed and pushed

## Step 2: Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a new cluster (free tier)
4. Create a database user
5. Get your connection string
6. Whitelist all IP addresses (0.0.0.0/0) for Vercel

## Step 3: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: Leave as is
   - **Build Command**: `cd frontend && npm run build`
   - **Output Directory**: `frontend/build`

## Step 4: Add Environment Variables

In Vercel dashboard, go to Settings → Environment Variables and add:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/legitevents?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
NODE_ENV=production
FRONTEND_URL=https://your-app-name.vercel.app
```

## Step 5: Deploy

1. Click "Deploy"
2. Wait for deployment to complete
3. Your app will be live at: `https://your-app-name.vercel.app`

## Step 6: Test Your Deployment

1. Visit your Vercel URL
2. Test user registration
3. Test event creation (admin)
4. Test ticket purchase

## Troubleshooting

- If CORS errors occur, check your FRONTEND_URL environment variable
- If database errors occur, verify your MongoDB Atlas connection string
- Check Vercel function logs for detailed error messages

## Post-Deployment

- Update your FRONTEND_URL environment variable with the actual Vercel URL
- Test all functionality thoroughly
- Share your live app URL!

## Your App Structure on Vercel

- Frontend: Served from `/frontend/build`
- Backend API: Available at `/api/*`
- Database: MongoDB Atlas (cloud)
- CDN: Automatic global distribution
