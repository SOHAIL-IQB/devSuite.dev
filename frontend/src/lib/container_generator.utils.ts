export type RuntimeStack = 'nodejs-express' | 'nextjs' | 'python-fastapi' | 'go' | 'rust' | 'java-spring';

export interface DockerfileOptions {
  stack: RuntimeStack;
  port: number;
  useMultiStage: boolean;
  useNonRoot: boolean;
  useAlpine: boolean;
}

export interface ComposeServiceOptions {
  enablePostgres: boolean;
  enableRedis: boolean;
  enableNginx: boolean;
  appName: string;
  appPort: number;
}

export interface K8sOptions {
  appName: string;
  replicas: number;
  containerPort: number;
  serviceType: 'ClusterIP' | 'NodePort' | 'LoadBalancer';
  enableIngress: boolean;
  host: string;
}

export interface LintIssue {
  severity: 'warning' | 'error' | 'info';
  message: string;
  line?: number;
}

/**
 * Generates an optimized production Dockerfile based on runtime stack and security choices.
 */
export function generateDockerfile(opts: DockerfileOptions): string {
  const { stack, port, useMultiStage, useNonRoot, useAlpine } = opts;

  switch (stack) {
    case 'nodejs-express':
      if (useMultiStage) {
        return `# Build Stage
FROM node:20-${useAlpine ? 'alpine' : 'slim'} AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build --if-present

# Production Runner Stage
FROM node:20-${useAlpine ? 'alpine' : 'slim'} AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
${useNonRoot ? 'USER node\n' : ''}EXPOSE ${port}
CMD ["node", "dist/index.js"]`;
      }
      return `FROM node:20-${useAlpine ? 'alpine' : 'slim'}
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY . .
${useNonRoot ? 'USER node\n' : ''}EXPOSE ${port}
CMD ["node", "index.js"]`;

    case 'nextjs':
      return `# Next.js Standalone Production Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${port}
${useNonRoot ? 'RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs\nUSER nextjs\n' : ''}COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE ${port}
CMD ["node", "server.js"]`;

    case 'python-fastapi':
      return `FROM python:3.11-${useAlpine ? 'alpine' : 'slim'}
WORKDIR /app
ENV PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
${useNonRoot ? 'RUN adduser --disabled-password --gecos "" appuser\nUSER appuser\n' : ''}EXPOSE ${port}
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${port}"]`;

    case 'go':
      return `# Build Stage
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server .

# Production Runner Stage
FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/server /app/server
${useNonRoot ? 'RUN adduser -D -u 1001 appuser\nUSER appuser\n' : ''}EXPOSE ${port}
CMD ["/app/server"]`;

    case 'rust':
      return `# Build Stage
FROM rust:1.77-alpine AS builder
WORKDIR /app
RUN apk add --no-cache musl-dev
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

# Production Runner Stage
FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/target/release/app /app/app
${useNonRoot ? 'RUN adduser -D -u 1001 appuser\nUSER appuser\n' : ''}EXPOSE ${port}
CMD ["/app/app"]`;

    case 'java-spring':
      return `# Build Stage
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

# Production Runner Stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
${useNonRoot ? 'RUN adduser -D -u 1001 appuser\nUSER appuser\n' : ''}EXPOSE ${port}
CMD ["java", "-jar", "app.jar"]`;

    default:
      return `# Standard Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
EXPOSE ${port}
CMD ["npm", "start"]`;
  }
}

/**
 * Generates multi-service docker-compose.yml specification.
 */
export function generateDockerCompose(opts: ComposeServiceOptions): string {
  const { appName, appPort, enablePostgres, enableRedis, enableNginx } = opts;

  let compose = `services:\n`;

  // App Service
  compose += `  ${appName}:\n`;
  compose += `    build:\n`;
  compose += `      context: .\n`;
  compose += `      dockerfile: Dockerfile\n`;
  compose += `    ports:\n`;
  compose += `      - "${appPort}:${appPort}"\n`;
  compose += `    environment:\n`;
  compose += `      - NODE_ENV=production\n`;
  compose += `      - PORT=${appPort}\n`;

  if (enablePostgres) {
    compose += `      - DATABASE_URL=postgresql://postgres:postgres_secure_pass@postgres:5432/${appName}_db?schema=public\n`;
  }
  if (enableRedis) {
    compose += `      - REDIS_URL=redis://redis:6379\n`;
  }

  const dependsOn: string[] = [];
  if (enablePostgres) dependsOn.push('postgres');
  if (enableRedis) dependsOn.push('redis');

  if (dependsOn.length > 0) {
    compose += `    depends_on:\n`;
    for (const dep of dependsOn) {
      compose += `      - ${dep}\n`;
    }
  }

  compose += `    restart: unless-stopped\n\n`;

  // PostgreSQL Service
  if (enablePostgres) {
    compose += `  postgres:\n`;
    compose += `    image: postgres:16-alpine\n`;
    compose += `    environment:\n`;
    compose += `      POSTGRES_USER: postgres\n`;
    compose += `      POSTGRES_PASSWORD: postgres_secure_pass\n`;
    compose += `      POSTGRES_DB: ${appName}_db\n`;
    compose += `    ports:\n`;
    compose += `      - "5432:5432"\n`;
    compose += `    volumes:\n`;
    compose += `      - postgres_data:/var/lib/postgresql/data\n`;
    compose += `    restart: unless-stopped\n\n`;
  }

  // Redis Service
  if (enableRedis) {
    compose += `  redis:\n`;
    compose += `    image: redis:7-alpine\n`;
    compose += `    ports:\n`;
    compose += `      - "6379:6379"\n`;
    compose += `    volumes:\n`;
    compose += `      - redis_data:/data\n`;
    compose += `    restart: unless-stopped\n\n`;
  }

  // Nginx Reverse Proxy
  if (enableNginx) {
    compose += `  nginx:\n`;
    compose += `    image: nginx:alpine\n`;
    compose += `    ports:\n`;
    compose += `      - "80:80"\n`;
    compose += `      - "443:443"\n`;
    compose += `    depends_on:\n`;
    compose += `      - ${appName}\n`;
    compose += `    restart: unless-stopped\n\n`;
  }

  // Volumes section
  const volumes: string[] = [];
  if (enablePostgres) volumes.push('postgres_data');
  if (enableRedis) volumes.push('redis_data');

  if (volumes.length > 0) {
    compose += `volumes:\n`;
    for (const v of volumes) {
      compose += `  ${v}:\n`;
    }
  }

  return compose.trim();
}

/**
 * Generates standard Kubernetes Deployment, Service, and Ingress manifests.
 */
export function generateK8sManifests(opts: K8sOptions): string {
  const { appName, replicas, containerPort, serviceType, enableIngress, host } = opts;

  let k8s = `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: ${appName}-deployment\n  labels:\n    app: ${appName}\nspec:\n  replicas: ${replicas}\n  selector:\n    matchLabels:\n      app: ${appName}\n  template:\n    metadata:\n      labels:\n        app: ${appName}\n    spec:\n      containers:\n      - name: ${appName}\n        image: ${appName}:latest\n        ports:\n        - containerPort: ${containerPort}\n        resources:\n          limits:\n            cpu: "500m"\n            memory: "512Mi"\n          requests:\n            cpu: "100m"\n            memory: "128Mi"\n        readinessProbe:\n          httpGet:\n            path: /api/health\n            port: ${containerPort}\n          initialDelaySeconds: 5\n          periodSeconds: 10\n        livenessProbe:\n          httpGet:\n            path: /api/health\n            port: ${containerPort}\n          initialDelaySeconds: 15\n          periodSeconds: 20\n---\n`;

  // Service
  k8s += `apiVersion: v1\nkind: Service\nmetadata:\n  name: ${appName}-service\nspec:\n  type: ${serviceType}\n  selector:\n    app: ${appName}\n  ports:\n  - protocol: TCP\n    port: 80\n    targetPort: ${containerPort}\n`;

  // Ingress
  if (enableIngress) {
    k8s += `---\napiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: ${appName}-ingress\n  annotations:\n    kubernetes.io/ingress.class: "nginx"\n    cert-manager.io/cluster-issuer: "letsencrypt-prod"\nspec:\n  rules:\n  - host: ${host}\n    http:\n      paths:\n      - path: /\n        pathType: Prefix\n        backend:\n          service:\n            name: ${appName}-service\n            port:\n              number: 80\n`;
  }

  return k8s.trim();
}

/**
 * Lints Dockerfile for security, performance, and best practices.
 */
export function validateDockerfile(content: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = content.split('\n');

  let hasUser = false;
  let fromCount = 0;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const lineNum = idx + 1;

    if (trimmed.startsWith('FROM')) {
      fromCount++;
      if (trimmed.includes(':latest') || (!trimmed.includes(':') && !trimmed.includes('AS'))) {
        issues.push({
          severity: 'warning',
          message: 'Avoid unpinned or ":latest" image tags for deterministic builds',
          line: lineNum,
        });
      }
    }

    if (trimmed.startsWith('USER') && !trimmed.includes('root')) {
      hasUser = true;
    }

    if (trimmed.includes('apt-get install') && !trimmed.includes('--no-install-recommends')) {
      issues.push({
        severity: 'info',
        message: 'Consider using "--no-install-recommends" to reduce image size',
        line: lineNum,
      });
    }

    if (trimmed.includes('npm install') && !trimmed.includes('npm ci')) {
      issues.push({
        severity: 'warning',
        message: 'Prefer "npm ci" over "npm install" in Docker builds for repeatable dependencies',
        line: lineNum,
      });
    }
  });

  if (!hasUser) {
    issues.push({
      severity: 'warning',
      message: 'Container runs as default "root" user. Consider defining a non-root USER for security.',
    });
  }

  if (fromCount === 1) {
    issues.push({
      severity: 'info',
      message: 'Single-stage build detected. Consider multi-stage builds to significantly reduce production image size.',
    });
  }

  return issues;
}
