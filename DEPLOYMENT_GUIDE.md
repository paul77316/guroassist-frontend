# Deployment Guide - Cloudflare Setup

This guide covers deploying your **frontend** (React/Vite) and **backend** (Laravel) applications using Git for version control between your development PC and server PC.

## Prerequisites

- GitHub account (or other Git hosting service)
- Cloudflare account
- Two PCs: Development PC (current) and Server PC (spare)
- Node.js installed on both PCs
- Git installed on both PCs
- PHP 8.3+ and Composer installed on both PCs (for backend)
- Laragon (recommended) or XAMPP on server PC (for backend)

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

## Step 4: Custom Domain Setup (guroassists.asia)

### 4.1 Buy your domain
1. Purchase `guroassists.asia` from a domain registrar (Namecheap, GoDaddy, Cloudflare Registrar, etc.)
2. Complete the purchase and wait for domain activation (usually immediate to 24 hours)

### 4.2 Add domain to Cloudflare
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **Add a Site** (or **Add a domain**)
3. Enter your domain: `guroassists.asia`
4. Select the **Free** plan (or Pro if you need advanced features)
5. Click **Continue**

### 4.3 Update nameservers at your domain registrar
Cloudflare will provide two nameservers (e.g., `amy.ns.cloudflare.com` and `bob.ns.cloudflare.com`):

1. **Copy the nameservers** from Cloudflare
2. Log in to your domain registrar (where you bought the domain)
3. Find **DNS Management** or **Nameservers** settings
4. **Replace** the existing nameservers with Cloudflare's nameservers
5. Save changes

**Important**: Nameserver changes can take 1-48 hours to propagate worldwide, but usually within 1-2 hours.

### 4.4 Verify DNS propagation
1. Go back to Cloudflare Dashboard
2. Wait for the status to change from "Pending" to "Active"
3. Cloudflare will scan your DNS records automatically

### 4.5 Add DNS records for your site
In Cloudflare DNS settings for `guroassists.asia`:

#### Option A: Use the root domain (guroassists.asia)
1. Click **Add Record**
2. Type: **CNAME**
3. Name: `@` (or leave blank for root domain)
4. Target: Your Cloudflare Pages project URL (e.g., `guroassist-frontend.pages.dev`)
5. Proxy status: **Proxied** (orange cloud icon) - this enables Cloudflare's CDN and SSL
6. Click **Save**

#### Option B: Use a subdomain (e.g., app.guroassists.asia)
1. Click **Add Record**
2. Type: **CNAME**
3. Name: `app`
4. Target: Your Cloudflare Pages project URL (e.g., `guroassist-frontend.pages.dev`)
5. Proxy status: **Proxied** (orange cloud icon)
6. Click **Save**

### 4.6 Connect custom domain to Cloudflare Pages
1. Go to **Workers & Pages** in Cloudflare Dashboard
2. Select your Pages project (guroassist-frontend)
3. Go to **Custom Domains** tab
4. Click **Set up a custom domain**
5. Enter your domain:
   - `guroassists.asia` (for root domain)
   - OR `app.guroassists.asia` (for subdomain)
6. Click **Continue**

### 4.7 Verify DNS configuration
Cloudflare will automatically detect the DNS record you created in Step 4.5:
- If you added the CNAME record in DNS, Cloudflare will confirm it
- Click **Activate domain** to complete the setup

### 4.8 SSL Certificate
Cloudflare automatically:
- Issues a free SSL certificate for your domain
- Enables HTTPS automatically
- Handles certificate renewal

**No manual SSL setup needed!**

### 4.9 Test your custom domain
1. Wait 5-10 minutes for DNS to propagate
2. Visit `https://guroassists.asia` (or your subdomain)
3. Your site should load with HTTPS enabled
4. Check the SSL certificate in your browser (click the lock icon)

### 4.10 Common DNS Record Examples

#### For frontend only:
```
Type: CNAME
Name: @ (or app)
Target: your-project.pages.dev
Proxy: Proxied (orange cloud)
```

#### If you have a backend API on a different service:
```
Type: CNAME
Name: api
Target: your-backend-domain.com
Proxy: Proxied (orange cloud)
```

### 4.11 Troubleshooting Custom Domain

#### Domain not loading
- Check DNS propagation: https://dnschecker.org/
- Verify nameservers are updated at your registrar
- Wait up to 48 hours for full propagation

#### SSL certificate not working
- Wait 15-30 minutes after domain activation
- Ensure DNS record is **Proxied** (orange cloud, not gray cloud)
- Check SSL/TLS settings in Cloudflare → **SSL/TLS** → set to **Full** or **Full (strict)**

#### 526 Error (Invalid SSL certificate)
- Go to Cloudflare → **SSL/TLS** → **Origin Server**
- Create an Origin Certificate if your backend needs it
- Or set SSL mode to **Flexible** (less secure but works with non-HTTPS origins)

---

## Step 5: Backend Deployment (Laravel)

### Option A: Deploy Backend to Cloud (Recommended)
**Services**: Railway, Render, DigitalOcean, or Laravel Forge

#### 5.1 Set up Git repository for backend
On your development PC:

```bash
cd D:\startup\GuroAssist\backend-stub
git init
git add .
git commit -m "Initial commit"
```

#### 5.2 Create GitHub repository for backend
1. Go to https://github.com/new
2. Create repository: `guroassist-backend`
3. **Do NOT** initialize with README, .gitignore, or license

#### 5.3 Connect backend to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/guroassist-backend.git
git branch -M main
git push -u origin main
```

#### 5.4 Deploy to Railway (Easiest for Laravel)
1. Go to https://railway.app/
2. Sign up and click **New Project**
3. Select **Deploy from GitHub repo**
4. Choose `guroassist-backend` repository
5. Railway will detect Laravel automatically
6. Configure environment variables:
   - `APP_ENV`: `production`
   - `APP_DEBUG`: `false`
   - `APP_URL`: `https://your-backend-url.railway.app`
   - `DB_CONNECTION`: `postgresql` (Railway provides PostgreSQL)
   - Railway will auto-fill database credentials
7. Click **Deploy**
8. Railway will install dependencies, run migrations, and deploy

#### 5.5 Get backend URL
After deployment, Railway will provide a URL like:
`https://guroassist-backend-production.up.railway.app`

Save this URL - you'll need it for frontend configuration.

---

### Option B: Deploy Backend on Server PC with Laragon
**Use this if you want to run backend locally on your server PC**

#### 5.1 Install Laragon on Server PC
1. Download Laragon: https://laragon.org/download
2. Install Laragon (Full version recommended)
3. Start Laragon - it will automatically start Apache, MySQL, and PHP

#### 5.2 Clone backend repository on Server PC
```bash
cd C:\projects
git clone https://github.com/YOUR_USERNAME/guroassist-backend.git
cd guroassist-backend
```

#### 5.3 Install dependencies
```bash
composer install
npm install
```

#### 5.4 Configure environment
```bash
copy .env.example .env
php artisan key:generate
```

Edit `.env` file:
```env
APP_NAME=GuroAssist
APP_ENV=production
APP_DEBUG=false
APP_URL=http://localhost

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=guroassist
DB_USERNAME=root
DB_PASSWORD=
```

#### 5.5 Create database
1. Open Laragon
2. Click **Menu** → **MySQL** → **Create database**
3. Enter database name: `guroassist`
4. Click **Create**

#### 5.6 Run migrations
```bash
php artisan migrate
```

#### 5.7 Build frontend assets
```bash
npm run build
```

#### 5.8 Start Laravel server
```bash
php artisan serve
```

Your backend will be available at: `http://localhost:8000`

#### 5.9 Make backend accessible from internet (Optional)
To access your server PC backend from outside your network:

**Option 1: Use Cloudflare Tunnel (Recommended)**
1. Install Cloudflare Tunnel on server PC
2. Tunnel `localhost:8000` to a subdomain like `api.guroassists.asia`
3. No port forwarding needed

**Option 2: Port Forwarding**
1. Forward port 8000 on your router to server PC's local IP
2. Access via your public IP: `http://YOUR_PUBLIC_IP:8000`
3. **Security warning**: This exposes your server directly - use Cloudflare Tunnel instead

---

### Option C: Deploy Backend with Laravel Forge (Professional)
**Best for production with custom domain**

1. Sign up for Laravel Forge: https://forge.laravel.com/
2. Connect your server (VPS from DigitalOcean, Linode, etc.)
3. Add your GitHub repository
4. Configure environment variables
5. Set up SSL certificate
6. Deploy with one click

---

## Step 6: Connect Frontend to Backend

### 6.1 Update frontend environment variables
On your development PC, edit frontend `.env` file:

```env
VITE_API_URL=https://your-backend-url.railway.app
# OR if using Laragon locally:
# VITE_API_URL=http://YOUR_SERVER_IP:8000
# OR if using Cloudflare Tunnel:
# VITE_API_URL=https://api.guroassists.asia
```

### 6.2 Update Cloudflare Pages environment variables
1. Go to Cloudflare Pages project → **Settings** → **Environment Variables**
2. Add variable:
   - Name: `VITE_API_URL`
   - Value: Your backend URL (e.g., `https://guroassist-backend-production.up.railway.app`)
3. Add to both **Production** and **Preview** environments

### 6.3 Rebuild frontend
```bash
npm run build
git add .
git commit -m "Update API URL"
git push
```

Cloudflare will automatically rebuild with the new API URL.

---

## Step 7: Configure API Subdomain in Cloudflare (Optional)

If you deployed backend to Railway or other cloud service:

### 7.1 Add API subdomain DNS record
In Cloudflare DNS for `guroassists.asia`:
1. Click **Add Record**
2. Type: **CNAME**
3. Name: `api`
4. Target: Your backend URL (e.g., `guroassist-backend-production.up.railway.app`)
5. Proxy status: **Proxied** (orange cloud)
6. Click **Save**

### 7.2 Update frontend to use custom API domain
Update frontend `.env`:
```env
VITE_API_URL=https://api.guroassists.asia
```

Update Cloudflare Pages environment variable with the same value.

### 7.3 Configure CORS in Laravel
In your Laravel backend, update `config/cors.php`:

```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],

'allowed_origins' => [
    'https://guroassists.asia',
    'https://app.guroassists.asia',
    'http://localhost:5173', // For local development
],

'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
```

---

## Step 8: Workflow - Making Changes

### On Development PC (Current PC)

#### 8.1 Make changes to frontend
- Edit files in `src/` directory
- Test locally with `npm run dev`

#### 8.2 Make changes to backend
- Edit Laravel files in `backend-stub/` directory
- Test locally with `php artisan serve`

#### 8.3 Commit and push frontend changes
```bash
cd D:\startup\GuroAssist\frontend
git add .
git commit -m "Description of frontend changes"
git push
```

#### 8.4 Commit and push backend changes
```bash
cd D:\startup\GuroAssist\backend-stub
git add .
git commit -m "Description of backend changes"
git push
```

### On Server PC (Optional - if you want to test locally first)

#### 8.5 Pull frontend changes
```bash
cd C:\projects\guroassist-frontend
git pull
npm install
npm run build
```

#### 8.6 Pull backend changes
```bash
cd C:\projects\guroassist-backend
git pull
composer install
php artisan migrate
npm run build
php artisan serve
```

### Automatic Deployment
- **Frontend**: Cloudflare Pages auto-deploys on push (1-3 minutes)
- **Backend (Railway)**: Auto-deploys on push (2-5 minutes)
- **Backend (Laragon)**: Manual pull and restart required

---

## Step 9: Folder Structure on Server PC

### Recommended Setup
```
C:\projects\
├── guroassist-frontend\      # Clone of frontend repo
└── guroassist-backend\       # Clone of backend repo
```

### Alternative (if you have D: drive)
```
D:\projects\
├── guroassist-frontend\
└── guroassist-backend\
```

**Why not C:\ root?**
- Permission issues with Windows
- Poor organization
- System drive space concerns
- Tool compatibility issues

### Creating the folders on Server PC
```bash
# Create projects directory
mkdir C:\projects
cd C:\projects

# Clone frontend
git clone https://github.com/YOUR_USERNAME/guroassist-frontend.git

# Clone backend
git clone https://github.com/YOUR_USERNAME/guroassist-backend.git
```

---

## Step 10: Troubleshooting

### Frontend Issues

#### Build fails on Cloudflare
- Check the **Build Logs** in Cloudflare Dashboard
- Ensure all dependencies are in `package.json`
- Check for environment variable issues

#### Local build works but Cloudflare fails
- Check Node.js version compatibility (Cloudflare uses Node.js 18 by default)
- Add `.nvmrc` file to specify Node version if needed:
  ```
  18
  ```

### Backend Issues

#### Railway deployment fails
- Check Railway build logs
- Ensure `composer.json` has all dependencies
- Check environment variables are set correctly
- Verify database connection settings

#### Laravel migration errors
```bash
# Reset and re-run migrations
php artisan migrate:fresh

# Or rollback specific migration
php artisan migrate:rollback
```

#### CORS errors in browser
- Update `config/cors.php` with correct allowed origins
- Ensure frontend URL is in `allowed_origins` array
- Clear config cache: `php artisan config:clear`

#### Permission errors on server PC
- Ensure Laragon is running as administrator
- Check `storage/` and `bootstrap/cache/` permissions:
  ```bash
  php artisan storage:link
  php artisan cache:clear
  ```

### Git Issues

#### Git pull conflicts
```bash
git pull --rebase
# or
git stash
git pull
git stash pop
```

#### Changes not pushing
```bash
# Check current branch
git branch

# Check remote
git remote -v

# Force push (use with caution)
git push -u origin main --force
```

---

## Step 11: Environment Variables Reference

### Frontend Environment Variables
**File**: `frontend/.env`

```env
VITE_API_URL=https://api.guroassists.asia
VITE_APP_NAME=GuroAssist
```

**Add to Cloudflare Pages**:
- Go to **Settings** → **Environment Variables**
- Add to both **Production** and **Preview** environments

### Backend Environment Variables
**File**: `backend-stub/.env`

```env
APP_NAME=GuroAssist
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.guroassists.asia

DB_CONNECTION=postgresql  # For Railway
# DB_CONNECTION=mysql     # For Laragon
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=guroassist
DB_USERNAME=root
DB_PASSWORD=

SESSION_DRIVER=database
CACHE_DRIVER=database
QUEUE_CONNECTION=database
```

**Add to Railway**:
- Go to Railway project → **Variables**
- Add each variable with appropriate values

---

## Quick Reference Commands

### Development PC (Frontend)
```bash
cd D:\startup\GuroAssist\frontend

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

### Development PC (Backend)
```bash
cd D:\startup\GuroAssist\backend-stub

# Stage all changes
git add .

# Commit changes
git commit -m "Your message"

# Push to GitHub
git push

# Run dev server
php artisan serve

# Run migrations
php artisan migrate

# Clear cache
php artisan cache:clear
php artisan config:clear
```

### Server PC (Frontend)
```bash
cd C:\projects\guroassist-frontend

# Pull latest changes
git pull

# Install new dependencies
npm install

# Build
npm run build
```

### Server PC (Backend - Laragon)
```bash
cd C:\projects\guroassist-backend

# Pull latest changes
git pull

# Install new dependencies
composer install

# Run migrations
php artisan migrate

# Build assets
npm run build

# Start server
php artisan serve
```

---

## Step 12: Recommended Deployment Architecture

### Option 1: All Cloud (Recommended)
```
Frontend: Cloudflare Pages (guroassists.asia)
Backend: Railway (api.guroassists.asia via CNAME)
Database: Railway PostgreSQL
```

**Pros**:
- No server maintenance
- Automatic scaling
- Free SSL
- Global CDN

**Cons**:
- Monthly costs (after free tier)
- Less control

### Option 2: Hybrid (Detailed Guide)
```
Frontend: Cloudflare Pages (guroassists.asia)
Backend: Server PC with Laragon + Cloudflare Tunnel (api.guroassists.asia)
Database: Local MySQL on server PC
```

**Pros**:
- No backend hosting costs
- Full control over backend
- Fast local database

**Cons**:
- Server PC must stay on
- Manual updates required
- Need Cloudflare Tunnel setup

---

### Detailed Setup Guide for Hybrid Option

#### Phase 1: Install Laragon on Server PC

1. **Download Laragon**
   - Go to https://laragon.org/download
   - Download **Laragon Full** (recommended)
   - Run the installer

2. **Configure Laragon**
   - Start Laragon
   - Click **Menu** → **Preferences**
   - Ensure PHP version is 8.3 or higher
   - Ensure MySQL is running
   - Click **Save & Restart**

3. **Test Laragon**
   - Open browser and visit `http://localhost`
   - You should see Laragon welcome page
   - MySQL should be accessible via phpMyAdmin at `http://localhost/phpmyadmin`

#### Phase 2: Set Up Laravel Backend on Server PC

1. **Clone backend repository**
   ```bash
   cd C:\projects
   git clone https://github.com/YOUR_USERNAME/guroassist-backend.git
   cd guroassist-backend
   ```

2. **Install dependencies**
   ```bash
   composer install
   npm install
   ```

3. **Configure environment**
   ```bash
   copy .env.example .env
   php artisan key:generate
   ```

4. **Edit `.env` file**
   ```env
   APP_NAME=GuroAssist
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://api.guroassists.asia

   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=guroassist
   DB_USERNAME=root
   DB_PASSWORD=

   SESSION_DRIVER=database
   CACHE_DRIVER=database
   QUEUE_CONNECTION=database
   ```

5. **Create database**
   - Open phpMyAdmin: `http://localhost/phpmyadmin`
   - Click **New** to create database
   - Enter name: `guroassist`
   - Click **Create**

6. **Run migrations**
   ```bash
   php artisan migrate
   ```

7. **Build frontend assets**
   ```bash
   npm run build
   ```

8. **Test backend locally**
   ```bash
   php artisan serve
   ```
   - Visit `http://localhost:8000` in browser
   - You should see Laravel application
   - Test API endpoints

#### Phase 3: Install Cloudflare Tunnel

1. **Download cloudflared**
   - Go to https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
   - Download **cloudflared for Windows**
   - Extract the zip file
   - Move `cloudflared.exe` to a permanent location (e.g., `C:\cloudflared\cloudflared.exe`)

2. **Add cloudflared to PATH**
   - Search for "Edit the system environment variables" in Windows
   - Click **Environment Variables**
   - Under **System variables**, find **Path**, click **Edit**
   - Click **New** and add `C:\cloudflared`
   - Click **OK** on all dialogs
   - Restart your terminal

3. **Authenticate with Cloudflare**
   ```bash
   cloudflared tunnel login
   ```
   - This will open a browser
   - Log in to your Cloudflare account
   - Select the `guroassists.asia` domain
   - Close browser when authorized

4. **Create a tunnel**
   ```bash
   cloudflared tunnel create guroassist-api
   ```
   - Save the tunnel ID that's returned (you'll need it)

5. **Configure the tunnel**
   Create a configuration file at `C:\cloudflared\config.yml`:
   ```yaml
   tunnel: YOUR_TUNNEL_ID_FROM_STEP_4
   credentials-file: C:\cloudflared\YOUR_TUNNEL_ID.json

   ingress:
     - hostname: api.guroassists.asia
       service: http://localhost:8000
     - service: http_status:404
   ```

6. **Route the tunnel to your domain**
   ```bash
   cloudflared tunnel route dns guroassist-api api.guroassists.asia
   ```
   - This automatically creates a CNAME record in Cloudflare DNS

7. **Install cloudflared as a Windows service**
   ```bash
   cloudflared service install
   ```

8. **Start the cloudflared service**
   ```bash
   cloudflared service start
   ```

9. **Verify tunnel is running**
   - Open Cloudflare Dashboard → **Zero Trust** → **Networks** → **Tunnels**
   - You should see `guroassist-api` tunnel with status "Healthy"
   - Visit `https://api.guroassists.asia` in browser
   - You should see your Laravel application

#### Phase 4: Configure Laravel for Production

1. **Update CORS configuration**
   Edit `config/cors.php`:
   ```php
   'paths' => ['api/*', 'sanctum/csrf-cookie'],

   'allowed_origins' => [
       'https://guroassists.asia',
       'https://app.guroassists.asia',
       'http://localhost:5173', // For local development
   ],

   'allowed_methods' => ['*'],
   'allowed_headers' => ['*'],
   ```

2. **Clear configuration cache**
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```

3. **Set up automatic Laravel server startup**
   - Download **NSSM** (Non-Sucking Service Manager): https://nssm.cc/download
   - Extract and run `nssm.exe`
   - Click **Install service**
   - Path: `C:\laragon\bin\php\php-8.3.x\php.exe`
   - Startup directory: `C:\projects\guroassist-backend`
   - Arguments: `artisan serve`
   - Service name: `LaravelGuroAssist`
   - Click **Install service**
   - Open Services (`services.msc`)
   - Find `LaravelGuroAssist` service
   - Set startup type to **Automatic**
   - Start the service

4. **Alternative: Use Laragon's virtual host**
   - Open Laragon
   - Click **Menu** → **www** → **guroassist-backend**
   - This creates a virtual host at `http://guroassist-backend.test`
   - Update Cloudflare tunnel config to point to this instead of `localhost:8000`

#### Phase 5: Update Frontend Configuration

1. **Update frontend `.env` on development PC**
   ```env
   VITE_API_URL=https://api.guroassists.asia
   ```

2. **Update Cloudflare Pages environment variables**
   - Go to Cloudflare Pages project → **Settings** → **Environment Variables**
   - Add `VITE_API_URL` = `https://api.guroassists.asia`
   - Add to both **Production** and **Preview** environments

3. **Rebuild and deploy frontend**
   ```bash
   cd D:\startup\GuroAssist\frontend
   npm run build
   git add .
   git commit -m "Update API URL for production"
   git push
   ```

#### Phase 6: Test Full Stack

1. **Test frontend**
   - Visit `https://guroassists.asia`
   - Test all frontend features

2. **Test API**
   - Visit `https://api.guroassists.asia/api/your-endpoint`
   - Test API endpoints with Postman or browser

3. **Test frontend-backend connection**
   - Use browser DevTools (F12) → Network tab
   - Make API calls from frontend
   - Verify requests go to `https://api.guroassists.asia`
   - Check for CORS errors

#### Phase 7: Server PC Maintenance

1. **Keep server PC running 24/7**
   - Disable sleep mode in Windows power settings
   - Set power plan to "High performance"
   - Disable automatic restarts for updates (configure active hours)

2. **Monitor services**
   - Open Services (`services.msc`)
   - Ensure `cloudflared` service is running
   - Ensure `LaravelGuroAssist` service is running
   - Ensure Laragon services (Apache, MySQL) are running

3. **Update backend workflow**
   ```bash
   cd C:\projects\guroassist-backend
   git pull
   composer install
   php artisan migrate
   npm run build
   # Restart Laravel service if needed
   ```

4. **Backup database**
   - Use phpMyAdmin to export database regularly
   - Or set up automated MySQL backups

#### Phase 8: Security Considerations

1. ** Firewall settings**
   - Ensure Windows Firewall allows Laravel (port 8000)
   - Cloudflare Tunnel handles external traffic, so keep ports closed

2. **Secure `.env` file**
   - Never commit `.env` to Git
   - Keep database password strong
   - Rotate `APP_KEY` if compromised

3. **SSL certificates**
   - Cloudflare Tunnel provides automatic SSL
   - No need to configure SSL on server PC
   - All traffic is encrypted end-to-end

4. **Rate limiting**
   - Configure Laravel rate limiting in `routes/api.php`
   - Example:
     ```php
     Route::middleware('throttle:60,1')->group(function () {
         // Your API routes
     });
     ```

#### Troubleshooting Hybrid Setup

**Cloudflare Tunnel not working**
```bash
# Check tunnel status
cloudflared tunnel info guroassist-api

# Restart service
cloudflared service restart

# View logs
cloudflared service logs
```

**Laravel service not starting**
- Check if port 8000 is already in use
- Verify PHP path in NSSM configuration
- Check Laravel logs in `storage/logs/laravel.log`

**Database connection errors**
- Ensure MySQL is running in Laragon
- Verify database credentials in `.env`
- Check if database exists in phpMyAdmin

**API not accessible from frontend**
- Verify CORS configuration
- Check Cloudflare Tunnel is routing correctly
- Ensure frontend API URL is correct
- Check browser console for errors

**Server PC restarted and services not running**
- Set services to Automatic startup
- Check Windows Event Viewer for service failures
- Consider using Task Scheduler to auto-start services

### Option 3: All Local
```
Frontend: Server PC with Node.js (app.guroassists.asia via Cloudflare Tunnel)
Backend: Server PC with Laragon (api.guroassists.asia via Cloudflare Tunnel)
Database: Local MySQL on server PC
```

**Pros**:
- No hosting costs
- Full control
- Everything local

**Cons**:
- Server PC must stay on 24/7
- Manual deployments
- No auto-scaling

---

## Step 13: Summary

### Initial Setup
1. **Frontend**: Initialize Git, push to GitHub, connect to Cloudflare Pages
2. **Backend**: Initialize Git, push to GitHub, deploy to Railway OR Laragon
3. **Domain**: Buy `guroassists.asia`, add to Cloudflare, configure DNS
4. **Connection**: Update frontend API URL, configure CORS in backend

### Daily Workflow
1. **Make changes** on development PC (frontend or backend)
2. **Test locally** with `npm run dev` or `php artisan serve`
3. **Commit and push** to GitHub
4. **Automatic deploy**:
   - Frontend: Cloudflare Pages (1-3 minutes)
   - Backend: Railway (2-5 minutes) OR manual pull on server PC
5. **Server sync**: Run `git pull` on server PC to keep it updated

### Final URLs
- **Frontend**: `https://guroassists.asia` (or `https://app.guroassists.asia`)
- **Backend API**: `https://api.guroassists.asia`

Your full-stack application will be live with custom domain, SSL, and automatic deployments!
