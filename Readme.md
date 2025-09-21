ssh -p 2222 root@46.202.167.20



sudo apt update -y
sudo apt upgrade -y

# Install git
sudo apt install git -y

# Install Node.js (latest LTS) and npm
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install nodejs -y
node -v
npm -v

# Optional: install build tools
sudo apt install build-essential -y



add ssh

git clone <YOUR_REPO_URL> backend
cd backend


npm install

nano .env

PORT=3000
MONGO_URI=<your_mongodb_connection_string>
NODE_ENV=production



sudo npm install -g pm2


pm2 start src/app.js --name backend --env production



pm2 startup systemd
pm2 save




sudo apt update
sudo apt install -y chromium-browser



temp
ssh -i "6sepEc2.pem" ubuntu@ec2-43-205-129-58.ap-south-1.compute.amazonaws.com





ngnx
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled



sudo nano /etc/nginx/sites-available/api.vikalpshorthand.com



server {
    listen 80;
    server_name api.vikalpshorthand.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

sudo nginx -t
sudo systemctl restart nginx



sudo certbot --nginx -d api.vikalpshorthand.com
