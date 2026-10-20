# Deployment Guide - Cloudflare Setup

This guide covers deploying your frontend application to Cloudflare Pages using Git for version control between your development PC and server PC.

## Prerequisites

- GitHub account (or other Git hosting service)
- Cloudflare account
- Two PCs: Development PC (current) and Server PC (spare)
- Node.js installed on both PCs
- Git installed on both PCs

---

## Step 1: Set Up Git Repository (Development PC)

### 1.1 Initialize Git (if not already done)
```bash
git init
```

### 1.2 Create a `.gitignore` file (if missing)
The following should already be in your `.gitignore`:
```
node_modules
dist
.DS_Store
*.log
.env
.env.local
```

### 1.3 Add files and make initial commit
```bash
git add .
git commit -m "Initial commit"
```

### 1.4 Create GitHub repository
1. Go to https://github.com/new
2. Create a new repository (e.g., `guroassist-frontend`)
3. **Do NOT** initialize with README, .gitignore, or license (since you already have files)

### 1.5 Connect local repo to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/guroassist-frontend.git
git branch -M main
git push -u origin main
```

---

## Step 2: Set Up Server PC

### 2.1 Clone the repository on Server PC
```bash
git clone https://github.com/YOUR_USERNAME/guroassist-frontend.git
cd guroassist-frontend
```

### 2.2 Install dependencies
```bash
npm install
```

### 2.3 Build the project (to verify it works)
```bash
npm run build
```

---

## Step 3: Set Up Cloudflare Pages

### 3.1 Connect Cloudflare to GitHub
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **Workers & Pages** → **Create Application**
3. Select **Pages** → **Connect to Git**
4. Authorize Cloudflare to access your GitHub account
5. Select the `guroassist-frontend` repository

### 3.2 Configure build settings
In Cloudflare Pages build settings:
- **Framework preset**: Vite
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/` (leave empty)
- **Environment variables**: (add if needed, e.g., API URLs)

### 3.3 Deploy
1. Click **Save and Deploy**
2. Cloudflare will automatically build and deploy your app
3. Wait for the deployment to complete (first build takes longer)
4. Note your deployment URL (e.g., `https://guroassist-frontend.pages.dev`)

---

## Step 4: Custom Domain (Optional)

### 4.1 Add custom domain in Cloudflare
1. In Cloudflare Pages project, go to **Custom Domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `app.yourdomain.com`)
4. Follow DNS instructions

### 4.2 Update DNS records
Cloudflare will provide CNAME records to add to your domain's DNS settings.

---

## Step 5: Workflow - Making Changes

### On Development PC (Current PC)

#### 5.1 Make changes to your code
- Edit files in `src/` directory
- Test locally with `npm run dev`

#### 5.2 Commit and push changes
```bash
git add .
git commit -m "Description of changes"
git push
```

### On Server PC (Optional - if you want to test locally first)

#### 5.3 Pull changes
```bash
git pull
```

#### 5.4 Rebuild (if needed)
```bash
npm run build
```

### Automatic Deployment to Cloudflare
- Cloudflare will automatically detect the push to GitHub
- It will rebuild and deploy your changes
- Typically takes 1-3 minutes

---

## Step 6: Troubleshooting

### Build fails on Cloudflare
- Check the **Build Logs** in Cloudflare Dashboard
- Ensure all dependencies are in `package.json`
- Check for environment variable issues

### Git pull conflicts
```bash
git pull --rebase
# or
git stash
git pull
git stash pop
```

### Local build works but Cloudflare fails
- Check Node.js version compatibility (Cloudflare uses Node.js 18 by default)
- Add `.nvmrc` file to specify Node version if needed:
  ```
  18
  ```

---

## Step 7: Environment Variables (If Needed)

### 7.1 Add environment variables locally
Create `.env` file (already in .gitignore):
```
VITE_API_URL=https://your-api.com
VITE_API_KEY=your_api_key
```

### 7.2 Add in Cloudflare
1. Go to Cloudflare Pages project
2. **Settings** → **Environment Variables**
3. Add the same variables (without `VITE_` prefix in some cases)
4. Add to both **Production** and **Preview** environments

---

## Quick Reference Commands

### Development PC
```bash
# Stage all changes
git add .

# Commit changes
git commit -m "Your message"

# Push to GitHub
git push

# Run dev server
npm run dev

# Build locally
npm run build
```

### Server PC
```bash
# Pull latest changes
git pull

# Install new dependencies
npm install

# Build
npm run build
```

---

## Summary

1. **Initial setup**: Push your code to GitHub from this PC
2. **Server setup**: Clone repo on server PC (optional, for local testing)
3. **Cloudflare setup**: Connect GitHub repo to Cloudflare Pages
4. **Daily workflow**: Make changes → `git add .` → `git commit` → `git push`
5. **Automatic deploy**: Cloudflare auto-deploys on push
6. **Server sync**: Run `git pull` on server PC to keep it updated

Your app will be live at the Cloudflare Pages URL (or your custom domain if configured)!
