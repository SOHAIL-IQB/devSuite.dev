import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateGitHubActionsWorkflow,
  generateGitLabCi,
  validateCiWorkflow,
} from '../cicd_generator.utils.ts';

describe('CI/CD Pipeline & Workflow Generator', () => {
  it('should generate Node.js GitHub Actions workflow with matrix testing and caching', () => {
    const yaml = generateGitHubActionsWorkflow({
      workflowName: 'Test & Release',
      language: 'node',
      triggers: {
        push: true,
        pullRequest: true,
        branches: ['main'],
        manualDispatch: true,
      },
      matrixTesting: true,
      enableCaching: true,
      runLint: true,
      runTests: true,
      runBuild: true,
      dockerPush: true,
      dockerRegistry: 'ghcr.io',
    });

    assert.ok(yaml.includes('name: Test & Release'));
    assert.ok(yaml.includes('push:'));
    assert.ok(yaml.includes('pull_request:'));
    assert.ok(yaml.includes('workflow_dispatch:'));
    assert.ok(yaml.includes('matrix:'));
    assert.ok(yaml.includes('node-version: [18.x, 20.x, 22.x]'));
    assert.ok(yaml.includes('cache: "npm"'));
    assert.ok(yaml.includes('npm ci'));
    assert.ok(yaml.includes('docker/build-push-action@v5'));
  });

  it('should generate Go GitHub Actions workflow', () => {
    const yaml = generateGitHubActionsWorkflow({
      workflowName: 'Go CI',
      language: 'go',
      triggers: {
        push: true,
        pullRequest: false,
        branches: ['main'],
        manualDispatch: false,
      },
      matrixTesting: false,
      enableCaching: true,
      runLint: true,
      runTests: true,
      runBuild: true,
      dockerPush: false,
    });

    assert.ok(yaml.includes('actions/setup-go@v5'));
    assert.ok(yaml.includes('go vet ./...'));
    assert.ok(yaml.includes('go test -v ./...'));
    assert.ok(yaml.includes('go build -v ./...'));
  });

  it('should generate GitLab CI configuration with stages and artifacts', () => {
    const gitlabYaml = generateGitLabCi({
      language: 'node',
      enableCache: true,
      runLint: true,
      runTests: true,
      runBuild: true,
      dockerBuild: true,
    });

    assert.ok(gitlabYaml.includes('stages:'));
    assert.ok(gitlabYaml.includes('node:20-alpine'));
    assert.ok(gitlabYaml.includes('cache:'));
    assert.ok(gitlabYaml.includes('lint_job:'));
    assert.ok(gitlabYaml.includes('test_job:'));
    assert.ok(gitlabYaml.includes('build_job:'));
    assert.ok(gitlabYaml.includes('docker_build:'));
  });

  it('should lint CI/CD workflows and detect security issues', () => {
    const insecureYaml = `
      name: Risky Pipeline
      on: [push]
      jobs:
        build:
          runs-on: ubuntu-latest
          steps:
            - uses: actions/checkout@main
            - run: npm install
            - name: Bad Secret
              run: echo "logging in"
              with:
                password: my_super_secret_password123
    `;

    const issues = validateCiWorkflow(insecureYaml);
    assert.ok(issues.length >= 2);
    assert.ok(issues.some((i) => i.message.includes('Avoid unpinned "@main" branch tags')));
    assert.ok(issues.some((i) => i.message.includes('npm ci')));
    assert.ok(issues.some((i) => i.message.includes('Potential plaintext credential detected')));
  });
});
