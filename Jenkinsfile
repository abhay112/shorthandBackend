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
    }
    
    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
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
                    
                    # Clean npm cache and install fresh
                    npm cache clean --force || true
                    rm -rf node_modules 2>/dev/null || true
                    
                    # Install with legacy peer deps to handle version conflicts
                    npm install --legacy-peer-deps
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
                    echo "🐳 Building Docker image: ${DOCKER_IMAGE}:${DOCKER_TAG}"
                    def image
                    if (DOCKER_REGISTRY) {
                        image = docker.build(
                            "${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${DOCKER_TAG}",
                            "--tag ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:latest ."
                        )
                    } else {
                        image = docker.build(
                            "${DOCKER_IMAGE}:${DOCKER_TAG}",
                            "--tag ${DOCKER_IMAGE}:latest ."
                        )
                    }
                    echo "✅ Docker image built successfully"
                }
            }
        }
        
        stage('Push to Docker Hub') {
            when {
                allOf {
                    branch 'main'
                    expression { return DOCKER_REGISTRY != '' }
                }
            }
            steps {
                script {
                    docker.withRegistry('https://index.docker.io/v1/', 'dockerhub-credentials') {
                        docker.image("${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${DOCKER_TAG}").push()
                        docker.image("${DOCKER_REGISTRY}/${DOCKER_IMAGE}:latest").push()
                        echo "✅ Images pushed to Docker Hub"
                    }
                }
            }
        }
        
        stage('Deploy with Docker Compose') {
            steps {
                dir("${DEPLOY_PATH}") {
                    sh '''
                        echo "🚀 Starting deployment..."
                        
                        # Use docker compose (v2) or docker-compose (v1) based on what's available
                        DOCKER_COMPOSE_CMD="docker compose"
                        if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
                            DOCKER_COMPOSE_CMD="docker-compose"
                        fi
                        
                        # Stop existing containers
                        echo "Stopping existing containers..."
                        $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down || true
                        
                        # Build images (or use existing)
                        echo "Building/updating images..."
                        $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml build --no-cache
                        
                        # Start services
                        echo "Starting services..."
                        $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up -d
                        
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
                Image: ${DOCKER_REGISTRY ? "${DOCKER_REGISTRY}/" : ""}${DOCKER_IMAGE}:${DOCKER_TAG}
                
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
