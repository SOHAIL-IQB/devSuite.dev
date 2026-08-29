import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDockerfile,
  generateDockerCompose,
  generateK8sManifests,
  validateDockerfile,
} from '../container_generator.utils.ts';

describe('Docker & Container Architecture Generator', () => {
  it('should generate optimized multi-stage Node.js Dockerfile', () => {
    const dockerfile = generateDockerfile({
      stack: 'nodejs-express',
      port: 8080,
      useMultiStage: true,
      useNonRoot: true,
      useAlpine: true,
    });

    assert.ok(dockerfile.includes('FROM node:20-alpine AS builder'));
    assert.ok(dockerfile.includes('FROM node:20-alpine AS runner'));
    assert.ok(dockerfile.includes('USER node'));
    assert.ok(dockerfile.includes('EXPOSE 8080'));
    assert.ok(dockerfile.includes('CMD ["node", "dist/index.js"]'));
  });

  it('should generate Go static binary Dockerfile', () => {
    const dockerfile = generateDockerfile({
      stack: 'go',
      port: 9000,
      useMultiStage: true,
      useNonRoot: true,
      useAlpine: true,
    });

    assert.ok(dockerfile.includes('FROM golang:1.22-alpine AS builder'));
    assert.ok(dockerfile.includes('CGO_ENABLED=0 GOOS=linux go build'));
    assert.ok(dockerfile.includes('USER appuser'));
    assert.ok(dockerfile.includes('EXPOSE 9000'));
  });

  it('should generate multi-service docker-compose.yml specification', () => {
    const compose = generateDockerCompose({
      appName: 'payment-service',
      appPort: 4000,
      enablePostgres: true,
      enableRedis: true,
      enableNginx: true,
    });

    assert.ok(compose.includes('services:'));
    assert.ok(compose.includes('payment-service:'));
    assert.ok(compose.includes('postgres:16-alpine'));
    assert.ok(compose.includes('redis:7-alpine'));
    assert.ok(compose.includes('nginx:alpine'));
    assert.ok(compose.includes('postgres_data:'));
  });

  it('should generate Kubernetes Deployment, Service, and Ingress manifests', () => {
    const k8s = generateK8sManifests({
      appName: 'auth-api',
      replicas: 4,
      containerPort: 5000,
      serviceType: 'ClusterIP',
      enableIngress: true,
      host: 'auth.devsuite.dev',
    });

    assert.ok(k8s.includes('kind: Deployment'));
    assert.ok(k8s.includes('replicas: 4'));
    assert.ok(k8s.includes('containerPort: 5000'));
    assert.ok(k8s.includes('kind: Service'));
    assert.ok(k8s.includes('kind: Ingress'));
    assert.ok(k8s.includes('host: auth.devsuite.dev'));
  });

  it('should lint Dockerfile and flag security/performance issues', () => {
    const insecureDockerfile = `
      FROM node:latest
      WORKDIR /app
      COPY . .
      RUN npm install
      EXPOSE 3000
      CMD ["npm", "start"]
    `;

    const issues = validateDockerfile(insecureDockerfile);
    assert.ok(issues.length >= 2);
    assert.ok(issues.some((i) => i.message.includes('Avoid unpinned or ":latest" image tags')));
    assert.ok(issues.some((i) => i.message.includes('runs as default "root" user')));
    assert.ok(issues.some((i) => i.message.includes('npm ci')));
  });
});
