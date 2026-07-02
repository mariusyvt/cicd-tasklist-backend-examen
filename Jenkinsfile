pipeline {
    agent any

    environment {
        REGISTRY = 'docker.io'
        IMAGE_NAME = "${REGISTRY}/muvay/marius-tasklist-backend"
        IMAGE_TAG = "${BUILD_NUMBER}"
        DOCKER_CREDENTIALS = 'marius-dockerhub-credentials'
        SONARQUBE_TOKEN = 'sonarqube-token'
    }

    triggers {
        githubPush()
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                echo '📦 Récupération du code source...'
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo '📥 Installation des dépendances...'
                sh 'npm install'
            }
        }

        stage('Build') {
            steps {
                echo '🏗️ Construction du projet...'
                sh 'npm run build'
            }
        }

        stage('Unit Tests') {
            steps {
                echo '✅ Exécution des tests unitaires...'
                sh 'npm run test:coverage'
            }
        }

        stage('E2E Tests') {
            steps {
                echo '✅ Exécution des tests E2E...'
                sh 'npm run test:e2e:coverage'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                echo '🔍 Analyse SonarQube...'
                withSonarQubeEnv('sonarqube') {
                    sh '''
                        npx sonarqube-scanner \
                            -Dsonar.projectKey=marius-tasklist-backend \
                            -Dsonar.sources=src \
                            -Dsonar.coverage.exclusions=**/__tests__/** \
                            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info,coverage-e2e/lcov.info
                    '''
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                echo '🐳 Construction de l\'image Docker...'
                sh '''
                    docker build \
                        -t ${IMAGE_NAME}:${IMAGE_TAG} \
                        -t ${IMAGE_NAME}:latest \
                        .
                '''
            }
        }

        stage('Push to DockerHub') {
            steps {
                echo '📤 Push vers DockerHub...'
                withCredentials([usernamePassword(credentialsId: "${DOCKER_CREDENTIALS}", 
                                                   usernameVariable: 'DOCKER_USER', 
                                                   passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin
                        docker push ${IMAGE_NAME}:${IMAGE_TAG}
                        docker push ${IMAGE_NAME}:latest
                        docker logout
                    '''
                }
            }
        }
    }

    post {
        always {
            echo '🧹 Nettoyage...'
            cleanWs()
        }

        success {
            echo '✅ Build réussi!'
        }

        failure {
            echo '❌ Build échoué!'
        }
    }
}
