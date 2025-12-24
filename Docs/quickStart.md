MAC

# 1. Install Docker Desktop (if not installed)
# Download from: https://www.docker.com/products/docker-desktop

# 2. Navigate to project
cd /path/to/shorthandBackend

# 3. Run local tests
bash scripts/test-deployment-local.sh


------------------------

ubuntu


# 1. Install Docker (if not installed)
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# 2. Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# 3. Navigate to project
cd /path/to/shorthandBackend

# 4. Run local tests
bash scripts/test-deployment-local.sh


--------------------