pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'tasklist-backend'
        DOCKER_TAG = "${BUILD_NUMBER}"
        DOCKER_HUB_REPO = "${DOCKER_HUB_USERNAME}/${DOCKER_IMAGE}"
        SONAR_PROJECT_KEY = 'tasklist-backend'
        NODE_VERSION = '20'
    }

    tools {
        nodejs 'NodeJS'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo 'Code source récupéré avec succès'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
                echo 'Dépendances installées avec succès'
            }
        }

        stage('Generate Prisma Client') {
            steps {
                sh 'npx prisma generate'
                echo 'Client Prisma généré avec succès'
            }
        }

        stage('Run Unit Tests') {
            steps {
                sh 'npm run test:coverage'
                echo 'Tests unitaires exécutés avec succès'
            }
            post {
                always {
                    // Publication des résultats des tests JUnit
                    junit allowEmptyResults: true, testResults: 'reports/junit.xml'
                    
                    // Publication de la couverture de code
                    publishHTML(target: [
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage/lcov-report',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        sonar-scanner \
                            -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                            -Dsonar.sources=src \
                            -Dsonar.exclusions=src/__tests__/**,**/*.test.ts \
                            -Dsonar.tests=src/__tests__ \
                            -Dsonar.test.inclusions=**/*.test.ts \
                            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                            -Dsonar.testExecutionReportPaths=reports/junit.xml
                    '''
                }
                echo 'Analyse SonarQube terminée'
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
                echo 'Quality Gate passé avec succès'
            }
        }

        stage('Build Application') {
            steps {
                sh 'npm run build'
                echo 'Application compilée avec succès'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    docker.build("${DOCKER_HUB_REPO}:${DOCKER_TAG}")
                    docker.build("${DOCKER_HUB_REPO}:latest")
                }
                echo 'Image Docker construite avec succès'
            }
        }

        stage('Security Scan - Trivy') {
            steps {
                sh '''
                    # Scan de l'image Docker avec Trivy
                    trivy image --exit-code 0 --severity LOW,MEDIUM,HIGH,CRITICAL \
                        --format table ${DOCKER_HUB_REPO}:${DOCKER_TAG}
                    
                    # Génération du rapport JSON
                    trivy image --format json --output trivy-report.json \
                        ${DOCKER_HUB_REPO}:${DOCKER_TAG}
                '''
                echo 'Scan de sécurité Trivy terminé'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.json', allowEmptyArchive: true
                }
            }
        }

        stage('Generate SBOM (SPDX)') {
            steps {
                sh '''
                    # Génération du SBOM au format SPDX avec Trivy
                    trivy image --format spdx-json --output sbom-spdx.json \
                        ${DOCKER_HUB_REPO}:${DOCKER_TAG}
                '''
                echo 'SBOM SPDX généré avec succès'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'sbom-spdx.json', allowEmptyArchive: true
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', 'docker-hub-credentials') {
                        docker.image("${DOCKER_HUB_REPO}:${DOCKER_TAG}").push()
                        docker.image("${DOCKER_HUB_REPO}:latest").push()
                    }
                }
                echo 'Images Docker publiées sur Docker Hub avec succès'
            }
        }

        stage('Cleanup') {
            steps {
                sh '''
                    docker rmi ${DOCKER_HUB_REPO}:${DOCKER_TAG} || true
                    docker rmi ${DOCKER_HUB_REPO}:latest || true
                '''
                echo 'Nettoyage terminé'
            }
        }
    }

    post {
        always {
            cleanWs()
            echo 'Pipeline terminé'
        }
        success {
            echo 'Pipeline exécuté avec succès!'
        }
        failure {
            echo 'Le pipeline a échoué. Vérifiez les logs pour plus de détails.'
        }
    }
}
