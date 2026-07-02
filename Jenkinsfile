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

        stage('Generate Prisma Client') {
            steps {
                echo '🔧 Génération du client Prisma...'
                sh 'npx prisma generate'
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
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'reports/junit.xml'
                    archiveArtifacts artifacts: 'coverage/**/*', allowEmptyArchive: true
                }
            }
        }

        stage('E2E Tests') {
            steps {
                echo '✅ Exécution des tests E2E...'
                sh 'npm run test:e2e:coverage'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'coverage-e2e/**/*', allowEmptyArchive: true
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                echo '🔍 Analyse SonarQube...'
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    sh '''
                        npx sonarqube-scanner \
                            -Dsonar.host.url=https://sonarqube.cicd.kits.ext.educentre.fr \
                            -Dsonar.token=${SONAR_TOKEN} \
                            -Dsonar.projectKey=marius-tasklist-backend \
                            -Dsonar.projectName=Marius-TaskList-Backend \
                            -Dsonar.sources=src \
                            -Dsonar.exclusions=src/__tests__/**,**/*.test.ts \
                            -Dsonar.tests=src/__tests__ \
                            -Dsonar.test.inclusions=**/*.test.ts \
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

        stage('Security Scan - Trivy') {
            steps {
                echo '🔒 Analyse de sécurité avec Trivy...'
                sh '''
                    echo "=========================================="
                    echo "🔍 SCAN DE SÉCURITÉ - IMAGE DOCKER"
                    echo "=========================================="
                    echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
                    echo ""
                    
                    # Scan des vulnérabilités HIGH et CRITICAL seulement (affichage concis)
                    trivy image --exit-code 0 --severity HIGH,CRITICAL \
                        --format table --scanners vuln \
                        ${IMAGE_NAME}:${IMAGE_TAG}
                    
                    echo ""
                    echo "=========================================="
                    echo "📊 RÉSUMÉ DU SCAN"
                    echo "=========================================="
                    
                    # Génération du rapport JSON complet (archivé)
                    trivy image --format json --output trivy-report.json \
                        --scanners vuln ${IMAGE_NAME}:${IMAGE_TAG}
                    
                    echo "✅ Rapport complet sauvegardé: trivy-report.json"
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.json', allowEmptyArchive: true
                }
            }
        }

        stage('Generate SBOM (SPDX)') {
            steps {
                echo '📋 Génération du SBOM au format SPDX...'
                sh '''
                    echo "=========================================="
                    echo "📦 GÉNÉRATION DU SBOM (SPDX)"
                    echo "=========================================="
                    echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
                    echo ""
                    
                    # Génération du SBOM au format SPDX avec Trivy
                    trivy image --format spdx-json --output sbom-spdx.json \
                        ${IMAGE_NAME}:${IMAGE_TAG}
                    
                    echo ""
                    echo "✅ SBOM généré avec succès: sbom-spdx.json"
                    echo ""
                    echo "📊 Informations du SBOM:"
                    head -50 sbom-spdx.json
                    echo "..."
                    echo ""
                    echo "=========================================="
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'sbom-spdx.json', allowEmptyArchive: true
                }
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
