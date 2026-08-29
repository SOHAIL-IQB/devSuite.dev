export type CiPlatform = 'github-actions' | 'gitlab-ci';
export type ProjectLanguage = 'node' | 'python' | 'go' | 'rust' | 'java';

export interface GitHubActionsOptions {
  workflowName: string;
  language: ProjectLanguage;
  triggers: {
    push: boolean;
    pullRequest: boolean;
    branches: string[];
    manualDispatch: boolean;
  };
  matrixTesting: boolean;
  enableCaching: boolean;
  runLint: boolean;
  runTests: boolean;
  runBuild: boolean;
  dockerPush: boolean;
  dockerRegistry?: 'ghcr.io' | 'docker.io';
}

export interface GitLabCiOptions {
  language: ProjectLanguage;
  enableCache: boolean;
  runLint: boolean;
  runTests: boolean;
  runBuild: boolean;
  dockerBuild: boolean;
}

export interface CiLintIssue {
  severity: 'warning' | 'error' | 'info';
  message: string;
  line?: number;
}

/**
 * Generates an idiomatic, production-grade GitHub Actions Workflow YAML file.
 */
export function generateGitHubActionsWorkflow(opts: GitHubActionsOptions): string {
  const {
    workflowName,
    language,
    triggers,
    matrixTesting,
    enableCaching,
    runLint,
    runTests,
    runBuild,
    dockerPush,
    dockerRegistry = 'ghcr.io',
  } = opts;

  let yaml = `name: ${workflowName || 'CI Pipeline'}\n\non:\n`;

  if (triggers.push) {
    yaml += `  push:\n    branches:\n`;
    triggers.branches.forEach((b) => {
      yaml += `      - ${b}\n`;
    });
  }

  if (triggers.pullRequest) {
    yaml += `  pull_request:\n    branches:\n`;
    triggers.branches.forEach((b) => {
      yaml += `      - ${b}\n`;
    });
  }

  if (triggers.manualDispatch) {
    yaml += `  workflow_dispatch:\n`;
  }

  yaml += `\npermissions:\n  contents: read\n  packages: write\n  pull-requests: write\n\njobs:\n`;

  // Test & Build Job
  yaml += `  test-and-build:\n    name: Quality & Test Matrix\n    runs-on: ubuntu-latest\n`;

  if (matrixTesting) {
    if (language === 'node') {
      yaml += `    strategy:\n      matrix:\n        node-version: [18.x, 20.x, 22.x]\n`;
    } else if (language === 'python') {
      yaml += `    strategy:\n      matrix:\n        python-version: ['3.10', '3.11', '3.12']\n`;
    } else if (language === 'go') {
      yaml += `    strategy:\n      matrix:\n        go-version: ['1.21', '1.22']\n`;
    }
  }

  yaml += `    steps:\n      - name: Checkout Repository\n        uses: actions/checkout@v4\n\n`;

  // Language Setup Step
  if (language === 'node') {
    const nodeVer = matrixTesting ? '${{ matrix.node-version }}' : '20.x';
    yaml += `      - name: Setup Node.js ${nodeVer}\n        uses: actions/setup-node@v4\n        with:\n          node-version: ${nodeVer}\n${enableCaching ? '          cache: "npm"\n' : ''}\n`;
    yaml += `      - name: Install Dependencies\n        run: npm ci\n\n`;
    if (runLint) {
      yaml += `      - name: Run Linter\n        run: npm run lint --if-present\n\n`;
    }
    if (runTests) {
      yaml += `      - name: Run Test Suite\n        run: npm test\n\n`;
    }
    if (runBuild) {
      yaml += `      - name: Build Application\n        run: npm run build\n\n`;
    }
  } else if (language === 'python') {
    const pyVer = matrixTesting ? '${{ matrix.python-version }}' : '3.11';
    yaml += `      - name: Set up Python ${pyVer}\n        uses: actions/setup-python@v5\n        with:\n          python-version: ${pyVer}\n${enableCaching ? '          cache: "pip"\n' : ''}\n`;
    yaml += `      - name: Install Dependencies\n        run: |\n          python -m pip install --upgrade pip\n          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi\n\n`;
    if (runLint) {
      yaml += `      - name: Lint with Flake8\n        run: flake8 .\n\n`;
    }
    if (runTests) {
      yaml += `      - name: Run Pytest\n        run: pytest\n\n`;
    }
  } else if (language === 'go') {
    const goVer = matrixTesting ? '${{ matrix.go-version }}' : '1.22';
    yaml += `      - name: Set up Go ${goVer}\n        uses: actions/setup-go@v5\n        with:\n          go-version: ${goVer}\n${enableCaching ? '          cache: true\n' : ''}\n`;
    if (runLint) {
      yaml += `      - name: Run Go Vet\n        run: go vet ./...\n\n`;
    }
    if (runTests) {
      yaml += `      - name: Run Go Tests\n        run: go test -v ./...\n\n`;
    }
    if (runBuild) {
      yaml += `      - name: Build Binary\n        run: go build -v ./...\n\n`;
    }
  } else if (language === 'rust') {
    yaml += `      - name: Set up Rust toolchain\n        uses: dtolnay/rust-toolchain@stable\n\n`;
    if (enableCaching) {
      yaml += `      - name: Rust Cache\n        uses: Swatinem/rust-cache@v2\n\n`;
    }
    if (runLint) {
      yaml += `      - name: Run Clippy\n        run: cargo clippy -- -D warnings\n\n`;
    }
    if (runTests) {
      yaml += `      - name: Run Cargo Tests\n        run: cargo test\n\n`;
    }
    if (runBuild) {
      yaml += `      - name: Build Release\n        run: cargo build --release\n\n`;
    }
  }

  // Docker Image Publish Job
  if (dockerPush) {
    yaml += `  docker-publish:\n    name: Build & Push Container\n    needs: test-and-build\n    runs-on: ubuntu-latest\n    if: github.ref == 'refs/heads/main'\n    steps:\n      - name: Checkout code\n        uses: actions/checkout@v4\n\n      - name: Set up Docker Buildx\n        uses: docker/setup-buildx-action@v3\n\n      - name: Log in to Registry\n        uses: docker/login-action@v3\n        with:\n          registry: ${dockerRegistry}\n          username: \${{ github.actor }}\n          password: \${{ secrets.GITHUB_TOKEN }}\n\n      - name: Build and push\n        uses: docker/build-push-action@v5\n        with:\n          context: .\n          push: true\n          tags: ${dockerRegistry}/\${{ github.repository }}:latest\n          cache-from: type=gha\n          cache-to: type=gha,mode=max\n`;
  }

  return yaml.trim();
}

/**
 * Generates an idiomatic GitLab CI/CD YAML configuration.
 */
export function generateGitLabCi(opts: GitLabCiOptions): string {
  const { language, enableCache, runLint, runTests, runBuild, dockerBuild } = opts;

  let yaml = `stages:\n  - test\n  - build\n\n`;

  let image = 'node:20-alpine';
  if (language === 'python') image = 'python:3.11-slim';
  if (language === 'go') image = 'golang:1.22-alpine';
  if (language === 'rust') image = 'rust:1.77-alpine';

  yaml += `default:\n  image: ${image}\n\n`;

  if (enableCache) {
    yaml += `cache:\n  key: \${CI_COMMIT_REF_SLUG}\n  paths:\n    - .npm/\n    - target/\n    - .cache/\n\n`;
  }

  // Lint job
  if (runLint) {
    yaml += `lint_job:\n  stage: test\n  script:\n`;
    if (language === 'node') yaml += `    - npm ci\n    - npm run lint\n\n`;
    else if (language === 'python') yaml += `    - pip install flake8\n    - flake8 .\n\n`;
    else if (language === 'go') yaml += `    - go vet ./...\n\n`;
    else if (language === 'rust') yaml += `    - cargo clippy -- -D warnings\n\n`;
  }

  // Test job
  if (runTests) {
    yaml += `test_job:\n  stage: test\n  script:\n`;
    if (language === 'node') yaml += `    - npm ci\n    - npm test\n\n`;
    else if (language === 'python') yaml += `    - pip install pytest\n    - pytest\n\n`;
    else if (language === 'go') yaml += `    - go test -v ./...\n\n`;
    else if (language === 'rust') yaml += `    - cargo test\n\n`;
  }

  // Build job
  if (runBuild) {
    yaml += `build_job:\n  stage: build\n  script:\n`;
    if (language === 'node') yaml += `    - npm ci\n    - npm run build\n  artifacts:\n    paths:\n      - dist/\n\n`;
    else if (language === 'go') yaml += `    - go build -o bin/app .\n  artifacts:\n    paths:\n      - bin/\n\n`;
    else if (language === 'rust') yaml += `    - cargo build --release\n  artifacts:\n    paths:\n      - target/release/\n\n`;
  }

  if (dockerBuild) {
    yaml += `docker_build:\n  stage: build\n  image: docker:24.0.5\n  services:\n    - docker:24.0.5-dind\n  script:\n    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .\n    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA\n  only:\n    - main\n`;
  }

  return yaml.trim();
}

/**
 * Lints CI/CD Workflow YAML for security and best practices.
 */
export function validateCiWorkflow(content: string): CiLintIssue[] {
  const issues: CiLintIssue[] = [];
  const lines = content.split('\n');

  let hasPermissions = false;
  let hasCheckout = false;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const lineNum = idx + 1;

    if (trimmed.startsWith('permissions:')) {
      hasPermissions = true;
    }

    if (trimmed.includes('actions/checkout')) {
      hasCheckout = true;
      if (trimmed.includes('@main') || trimmed.includes('@master')) {
        issues.push({
          severity: 'warning',
          message: 'Avoid unpinned "@main" branch tags for actions. Pin to specific SHA or major version (e.g. @v4).',
          line: lineNum,
        });
      }
    }

    if (trimmed.includes('npm install') && !trimmed.includes('npm ci')) {
      issues.push({
        severity: 'warning',
        message: 'Prefer "npm ci" over "npm install" in automated CI pipelines for reproducible builds.',
        line: lineNum,
      });
    }

    if (trimmed.includes('password:') && !trimmed.includes('secrets.') && !trimmed.includes('GITHUB_TOKEN') && !trimmed.includes('${{')) {
      issues.push({
        severity: 'error',
        message: 'Potential plaintext credential detected in workflow YAML. Store credentials in GitHub Secrets.',
        line: lineNum,
      });
    }
  });

  if (!hasPermissions && content.includes('jobs:')) {
    issues.push({
      severity: 'info',
      message: 'Consider defining explicit "permissions:" block to enforce least-privilege security.',
    });
  }

  if (!hasCheckout && content.includes('jobs:')) {
    issues.push({
      severity: 'warning',
      message: 'Workflow does not seem to include "actions/checkout" step before running commands.',
    });
  }

  return issues;
}
