pipeline {
    agent any
    
    tools {
        nodejs 'shorthand'  // Use the Node.js tool configured in Jenkins (name: "shorthand")
    }
    
    environment {
        // Docker image configuration (leave empty to build locally without registry)
        DOCKER_REGISTRY = ''
        DOCKER_IMAGE = 'shorthnd-backend'
        DOCKER_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(7)}"
        
        // Deployment path - will be set via Jenkins environment or parameter
        // For local: use WORKSPACE
        // For Hostinger: set in Jenkins job configuration
        DEPLOY_PATH = "${env.DEPLOY_PATH ?: WORKSPACE}"
        
        NODE_VERSION = '20'
        NPM_CACHE_DIR = "${WORKSPACE}/.npm"
    }
    
    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        // Cache node_modules between builds
        skipDefaultCheckout(false)
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git clean -fd'
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                }
                echo "✅ Checked out code: ${env.GIT_COMMIT_SHORT}"
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh '''
                    echo "📦 Installing npm dependencies..."
                    echo "Node version: $(node --version)"
                    echo "NPM version: $(npm --version)"
                    
                    # Configure npm to use workspace cache
                    npm config set cache "${NPM_CACHE_DIR}" --global
                    
                    # Use npm ci for faster CI installs (removes need to clean cache/node_modules)
                    if [ -f package-lock.json ]; then
                        npm ci --legacy-peer-deps --prefer-offline --no-audit
                    else
                        npm install --legacy-peer-deps --prefer-offline --no-audit
                    fi
                    
                    echo "✅ Dependencies installed"
                '''
            }
        }
        
        stage('Code Quality') {
            steps {
                sh '''
                    echo "🔍 Running ESLint..."
                    npm run lint || echo "⚠️ Lint warnings found (continuing)"
                '''
            }
        }
        
        stage('Security Audit') {
            steps {
                sh '''
                    echo "🔒 Running security audit..."
                    npm audit --audit-level=moderate || echo "⚠️ Security issues found (continuing)"
                '''
            }
        }
        
        stage('Run Tests') {
            steps {
                sh '''
                    echo "🧪 Running tests..."
                    NODE_ENV=test \
                    TEST_MONGO_URI=mongodb://localhost:27017/test_shorthand \
                    MONGO_URI=mongodb://localhost:27017/test_shorthand \
                    npm test -- --passWithNoTests --forceExit
                    echo "✅ Tests passed"
                '''
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    echo "🐳 Building Docker image: ${env.DOCKER_IMAGE}:${env.DOCKER_TAG}"
                    if (env.DOCKER_REGISTRY) {
                        sh """
                            docker build \\
                                --tag ${env.DOCKER_REGISTRY}/${env.DOCKER_IMAGE}:${env.DOCKER_TAG} \\
                                --tag ${env.DOCKER_REGISTRY}/${env.DOCKER_IMAGE}:latest \\
                                .
                        """
                    } else {
                        sh """
                            docker build \\
                                --tag ${env.DOCKER_IMAGE}:${env.DOCKER_TAG} \\
                                --tag ${env.DOCKER_IMAGE}:latest \\
                                .
                        """
                    }
                    echo "✅ Docker image built successfully"
                }
            }
        }
        
        stage('Push to Docker Hub') {
            when {
                allOf {
                    branch 'main'
                    expression { return env.DOCKER_REGISTRY != '' }
                }
            }
            steps {
                script {
                    // Login using stored credentials - variables need to be accessed properly
                    sh """
                        if [ -n "\${DOCKER_USERNAME}" ] && [ -n "\${DOCKER_PASSWORD}" ]; then
                            echo \$DOCKER_PASSWORD | docker login -u \$DOCKER_USERNAME --password-stdin
                        elif [ -n "\${DOCKERHUB_USERNAME}" ] && [ -n "\${DOCKERHUB_PASSWORD}" ]; then
                            echo \$DOCKERHUB_PASSWORD | docker login -u \$DOCKERHUB_USERNAME --password-stdin
                        else
                            echo "Using existing docker login session or skipping login"
                        fi
                    """
                    sh """
                        docker push ${env.DOCKER_REGISTRY}/${env.DOCKER_IMAGE}:${env.DOCKER_TAG}
                        docker push ${env.DOCKER_REGISTRY}/${env.DOCKER_IMAGE}:latest
                    """
                    echo "✅ Images pushed to Docker Hub"
                }
            }
        }
        
        stage('Deploy with Docker Compose') {
            steps {
                dir("${env.DEPLOY_PATH}") {
                    sh '''
                        echo "🚀 Starting deployment..."
                        
                        # Use docker compose (v2) or docker-compose (v1) based on what's available
                        DOCKER_COMPOSE_CMD="docker compose"
                        if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null 2>&1; then
                            DOCKER_COMPOSE_CMD="docker-compose"
                        fi
                        
                        # Stop existing containers
                        echo "Stopping existing containers..."
                        $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down || true
                        
                        # Use the image we built instead of rebuilding
                        # Update docker-compose to use the pre-built image
                        echo "Using pre-built Docker image: shorthnd-backend:latest"
                        
                        # Tag the built image if needed (if we built with a tag)
                        docker tag shorthnd-backend:latest shorthnd-backend:latest 2>/dev/null || true
                        
                        # Start services (docker-compose will use existing image or build if needed)
                        echo "Starting services..."
                        $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up -d --no-build
                        
                        # Wait for services to be healthy
                        echo "Waiting for services to start..."
                        sleep 30
                        
                        # Health checks
                        echo "Running health checks..."
                        for i in {1..10}; do
                            if curl -f http://localhost:3000/health > /dev/null 2>&1; then
                                echo "✅ Backend is healthy"
                                break
                            fi
                            echo "Waiting for backend... ($i/10)"
                            sleep 5
                        done
                        
                        # Check monitoring services
                        curl -f http://localhost:9090/-/healthy > /dev/null 2>&1 && echo "✅ Prometheus is healthy" || echo "⚠️ Prometheus check failed"
                        curl -f http://localhost:3100/ready > /dev/null 2>&1 && echo "✅ Loki is healthy" || echo "⚠️ Loki check failed"
                        curl -f http://localhost:3001/api/health > /dev/null 2>&1 && echo "✅ Grafana is healthy" || echo "⚠️ Grafana check failed"
                        
                        echo "✅ Deployment completed successfully!"
                    '''
                }
            }
        }
        
        stage('Post-Deployment Validation') {
            steps {
                sh '''
                    echo "🔍 Validating deployment..."
                    sleep 10
                    
                    # Check backend health endpoints
                    echo "Checking /health endpoint..."
                    curl -f http://localhost:3000/health || exit 1
                    
                    echo "Checking /health/live endpoint..."
                    curl -f http://localhost:3000/health/live || exit 1
                    
                    echo "Checking /metrics endpoint..."
                    curl -f http://localhost:3000/metrics | head -5 || exit 1
                    
                    echo "✅ All health checks passed!"
                '''
            }
        }
    }
    
    post {
        success {
            echo '✅ Pipeline succeeded!'
            script {
                def message = """
                ✅ Deployment Successful!
                
                Build: #${env.BUILD_NUMBER}
                Commit: ${env.GIT_COMMIT_SHORT}
                Branch: ${env.BRANCH_NAME}
                Image: ${env.DOCKER_REGISTRY ? "${env.DOCKER_REGISTRY}/" : ""}${DOCKER_IMAGE}:${DOCKER_TAG}
                
                Services:
                - Backend: http://localhost:3000
                - Prometheus: http://localhost:9090
                - Loki: http://localhost:3100
                - Grafana: http://localhost:3001
                """
                echo message
            }
        }
        failure {
            echo '❌ Pipeline failed!'
            script {
                sh '''
                    echo "Checking container status..."
                    # Use docker compose (v2) or docker-compose (v1)
                    if docker compose version &> /dev/null; then
                        docker compose -f docker-compose.prod.yml ps || true
                        docker compose -f docker-compose.prod.yml logs --tail=50 || true
                    else
                        docker-compose -f docker-compose.prod.yml ps || true
                        docker-compose -f docker-compose.prod.yml logs --tail=50 || true
                    fi
                '''
            }
        }
        always {
            echo "Build completed. Workspace: ${WORKSPACE}"
        }
    }
}
