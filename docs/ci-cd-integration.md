# CI/CD Integration

Integrate Nodrift into your CI/CD pipelines for automated contract verification.

## Table of Contents

- [Overview](#overview)
- [GitHub Actions](#github-actions)
- [GitLab CI](#gitlab-ci)
- [Jenkins](#jenkins)
- [CircleCI](#circleci)
- [Azure Pipelines](#azure-pipelines)
- [Best Practices](#best-practices)

---

## Overview

Nodrift is designed for CI/CD integration with:

- **Exit Codes** - Proper exit codes for pipeline control
- **JUnit XML** - Test result reporting
- **JSON Output** - Machine-readable results
- **Fail-on-Drift** - Configurable failure behavior

### Key Features

-  Automated verification on every deployment
-  Test result reporting and visualization
-  Slack/Discord notifications
-  Multi-network support
-  Parallel execution

---

## GitHub Actions

### Basic Workflow

```yaml
name: Contract Verification

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Nodrift
        run: npm install -g nodrift
      
      - name: Verify Contracts
        env:
          RPC_URL: ${{ secrets.RPC_URL }}
        run: |
          nodrift config.yaml --fail-on-drift --output junit
      
      - name: Publish Test Results
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always()
        with:
          files: test-results/nodrift-junit.xml
```

### Advanced Workflow with Matrix

```yaml
name: Multi-Network Verification

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  verify:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        network: [ethereum, polygon, bsc, arbitrum]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Install Nodrift
        run: npm install -g nodrift
      
      - name: Verify ${{ matrix.network }}
        env:
          RPC_URL: ${{ secrets[format('{0}_RPC_URL', matrix.network)] }}
        run: |
          nodrift configs/${{ matrix.network }}.yaml \
            --fail-on-drift \
            --output junit \
            --junit-file test-results/${{ matrix.network }}-results.xml
      
      - name: Upload Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: verification-results-${{ matrix.network }}
          path: test-results/${{ matrix.network }}-results.xml
      
      - name: Publish Test Results
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always()
        with:
          files: test-results/${{ matrix.network }}-results.xml
          check_name: Verification Results (${{ matrix.network }})
```

### With Slack Notifications

```yaml
name: Contract Verification with Notifications

on:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Nodrift
        run: npm install -g nodrift
      
      - name: Verify Contracts
        id: verify
        env:
          RPC_URL: ${{ secrets.RPC_URL }}
        run: |
          nodrift config.yaml --fail-on-drift --output json > results.json
          echo "results=$(cat results.json)" >> $GITHUB_OUTPUT
        continue-on-error: true
      
      - name: Notify Slack on Success
        if: steps.verify.outcome == 'success'
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": " Contract verification passed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Contract Verification Passed* \n\nAll contracts match expected configuration."
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
      
      - name: Notify Slack on Failure
        if: steps.verify.outcome == 'failure'
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": " Contract drift detected",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Contract Drift Detected* \n\nContracts do not match expected configuration.\n\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Details>"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
      
      - name: Fail if verification failed
        if: steps.verify.outcome == 'failure'
        run: exit 1
```

---

## GitLab CI

### Basic Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - verify

verify-contracts:
  stage: verify
  image: node:18
  script:
    - npm install -g nodrift
    - nodrift config.yaml --fail-on-drift --output junit
  artifacts:
    reports:
      junit: test-results/nodrift-junit.xml
    paths:
      - test-results/
    when: always
  only:
    - main
    - develop
```

### Multi-Network Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - verify

.verify-template: &verify-template
  stage: verify
  image: node:18
  script:
    - npm install -g nodrift
    - nodrift configs/${NETWORK}.yaml --fail-on-drift --output junit --junit-file test-results/${NETWORK}-results.xml
  artifacts:
    reports:
      junit: test-results/${NETWORK}-results.xml
    paths:
      - test-results/
    when: always

verify-ethereum:
  <<: *verify-template
  variables:
    NETWORK: ethereum
    RPC_URL: $ETHEREUM_RPC_URL

verify-polygon:
  <<: *verify-template
  variables:
    NETWORK: polygon
    RPC_URL: $POLYGON_RPC_URL

verify-bsc:
  <<: *verify-template
  variables:
    NETWORK: bsc
    RPC_URL: $BSC_RPC_URL
```

### Scheduled Verification

```yaml
# .gitlab-ci.yml
verify-contracts:
  stage: verify
  image: node:18
  script:
    - npm install -g nodrift
    - nodrift config.yaml --fail-on-drift --output junit
  artifacts:
    reports:
      junit: test-results/nodrift-junit.xml
  only:
    - schedules
    - main
```

---

## Jenkins

### Declarative Pipeline

```groovy
pipeline {
    agent any
    
    environment {
        RPC_URL = credentials('rpc-url')
    }
    
    stages {
        stage('Setup') {
            steps {
                sh 'npm install -g nodrift'
            }
        }
        
        stage('Verify Contracts') {
            steps {
                sh 'nodrift config.yaml --fail-on-drift --output junit'
            }
        }
    }
    
    post {
        always {
            junit 'test-results/nodrift-junit.xml'
        }
        success {
            echo 'Contract verification passed!'
        }
        failure {
            echo 'Contract drift detected!'
            // Send notification
        }
    }
}
```

### Scripted Pipeline with Parallel Execution

```groovy
node {
    stage('Setup') {
        checkout scm
        sh 'npm install -g nodrift'
    }
    
    stage('Verify Contracts') {
        parallel(
            'Ethereum': {
                withEnv([
                    "RPC_URL=${env.ETHEREUM_RPC_URL}"
                ]) {
                    sh 'nodrift configs/ethereum.yaml --fail-on-drift --output junit --junit-file test-results/ethereum-results.xml'
                }
            },
            'Polygon': {
                withEnv([
                    "RPC_URL=${env.POLYGON_RPC_URL}"
                ]) {
                    sh 'nodrift configs/polygon.yaml --fail-on-drift --output junit --junit-file test-results/polygon-results.xml'
                }
            },
            'BSC': {
                withEnv([
                    "RPC_URL=${env.BSC_RPC_URL}"
                ]) {
                    sh 'nodrift configs/bsc.yaml --fail-on-drift --output junit --junit-file test-results/bsc-results.xml'
                }
            }
        )
    }
    
    stage('Publish Results') {
        junit 'test-results/*.xml'
    }
}
```

---

## CircleCI

### Basic Configuration

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  verify:
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout
      
      - run:
          name: Install Nodrift
          command: npm install -g nodrift
      
      - run:
          name: Verify Contracts
          command: nodrift config.yaml --fail-on-drift --output junit
          environment:
            RPC_URL: $RPC_URL
      
      - store_test_results:
          path: test-results
      
      - store_artifacts:
          path: test-results

workflows:
  verify-contracts:
    jobs:
      - verify:
          context: production
```

### Multi-Network with Matrix

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  verify:
    parameters:
      network:
        type: string
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout
      
      - run:
          name: Install Nodrift
          command: npm install -g nodrift
      
      - run:
          name: Verify << parameters.network >>
          command: |
            nodrift configs/<< parameters.network >>.yaml \
              --fail-on-drift \
              --output junit \
              --junit-file test-results/<< parameters.network >>-results.xml
      
      - store_test_results:
          path: test-results
      
      - store_artifacts:
          path: test-results

workflows:
  verify-all-networks:
    jobs:
      - verify:
          name: verify-ethereum
          network: ethereum
          context: ethereum
      - verify:
          name: verify-polygon
          network: polygon
          context: polygon
      - verify:
          name: verify-bsc
          network: bsc
          context: bsc
```

---

## Azure Pipelines

### Basic Pipeline

```yaml
# azure-pipelines.yml
trigger:
  - main
  - develop

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'
    displayName: 'Install Node.js'
  
  - script: npm install -g nodrift
    displayName: 'Install Nodrift'
  
  - script: |
      nodrift config.yaml --fail-on-drift --output junit
    displayName: 'Verify Contracts'
    env:
      RPC_URL: $(RPC_URL)
      CONTRACT_ADDRESS: $(CONTRACT_ADDRESS)
      EXPECTED_OWNER: $(EXPECTED_OWNER)
  
  - task: PublishTestResults@2
    condition: always()
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: 'test-results/nodrift-junit.xml'
      testRunTitle: 'Contract Verification'
```

### Multi-Stage Pipeline

```yaml
# azure-pipelines.yml
trigger:
  - main

stages:
  - stage: Verify
    displayName: 'Verify Contracts'
    jobs:
      - job: VerifyEthereum
        displayName: 'Verify Ethereum'
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
          - script: npm install -g nodrift
            displayName: 'Install Nodrift'
          - script: |
              nodrift configs/ethereum.yaml --fail-on-drift --output junit --junit-file test-results/ethereum-results.xml
            displayName: 'Verify Ethereum Contracts'
            env:
              RPC_URL: $(ETHEREUM_RPC_URL)
              CONTRACT_ADDRESS: $(ETHEREUM_CONTRACT_ADDRESS)
          - task: PublishTestResults@2
            condition: always()
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: 'test-results/ethereum-results.xml'
      
      - job: VerifyPolygon
        displayName: 'Verify Polygon'
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
          - script: npm install -g nodrift
            displayName: 'Install Nodrift'
          - script: |
              nodrift configs/polygon.yaml --fail-on-drift --output junit --junit-file test-results/polygon-results.xml
            displayName: 'Verify Polygon Contracts'
            env:
              RPC_URL: $(POLYGON_RPC_URL)
              CONTRACT_ADDRESS: $(POLYGON_CONTRACT_ADDRESS)
          - task: PublishTestResults@2
            condition: always()
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: 'test-results/polygon-results.xml'
```

---

## Best Practices

### 1. Use Secrets for Sensitive Data

```yaml
#  Good - use secrets
env:
  RPC_URL: ${{ secrets.RPC_URL }}
  PRIVATE_KEY: ${{ secrets.PRIVATE_KEY }}

#  Bad - hardcoded values
env:
  RPC_URL: "https://eth-mainnet.g.alchemy.com/v2/abc123"
```

### 2. Always Publish Test Results

```yaml
#  Good - publish results even on failure
- name: Publish Test Results
  uses: EnricoMi/publish-unit-test-result-action@v2
  if: always()
  with:
    files: test-results/nodrift-junit.xml
```

### 3. Use Fail-on-Drift in CI/CD

```yaml
#  Good - fail pipeline on drift
run: nodrift config.yaml --fail-on-drift

#  Bad - don't fail on drift (for CI/CD)
run: nodrift config.yaml
```

### 4. Cache Dependencies

```yaml
#  Good - cache npm packages
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '18'
    cache: 'npm'
```

### 5. Run on Schedule

```yaml
#  Good - periodic verification
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
```

### 6. Parallel Execution for Multiple Networks

```yaml
#  Good - parallel execution
strategy:
  matrix:
    network: [ethereum, polygon, bsc]
```

### 7. Store Artifacts

```yaml
#  Good - store results as artifacts
- name: Upload Results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: verification-results
    path: test-results/
```

---

## Exit Codes

Nodrift uses standard exit codes:

| Code | Meaning | CI/CD Behavior |
|------|---------|----------------|
| 0 | Success (no drift) |  Pass |
| 1 | Drift detected (with `--fail-on-drift`) |  Fail |
| 2 | Configuration error |  Fail |
| 3 | Network error |  Fail |
| 4 | Contract error |  Fail |
| 5 | Validation error |  Fail |
| 6 | Unknown error |  Fail |

---

## Next Steps

- **[Configuration](configuration.md)** - Configure your verification
- **[Examples](../examples/)** - Real-world examples
- **[Troubleshooting](troubleshooting.md)** - Common issues
