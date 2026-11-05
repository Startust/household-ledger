import { defineRailway, postgres, project, service, volume } from 'railway/iac';

export default defineRailway(() => {
  const Postgres = postgres('Postgres', { region: 'us-east4-eqdc4a' });
  Postgres.networking = { privateNetworkEndpoint: 'postgres' };
  const postgresVolume = volume('postgres-volume', {
    alerts: { usage: { '100': {}, '80': {}, '95': {} } },
    allowOnlineResize: true,
    region: 'us-east4-eqdc4a',
    sizeMB: 50000,
  });
  const web = service('web', {
    build: {
      buildEnvironment: 'V3',
      builder: 'DOCKERFILE',
      dockerfilePath: 'Dockerfile',
      watchPatterns: [
        'src/**',
        'web/**',
        'prisma/**',
        'assets/**',
        'package*.json',
        'Dockerfile',
        'tsconfig.json',
        'prisma.config.ts',
      ],
    },
    deploy: {
      startCommand: 'node dist/src/main.js',
      preDeployCommand: ['npm run db:migrate'],
      healthcheckPath: '/health/ready',
      healthcheckTimeout: 120,
    },
    replicas: { 'us-east4-eqdc4a': 1 },
  });
  const worker = service('worker', {
    build: {
      buildEnvironment: 'V3',
      builder: 'DOCKERFILE',
      dockerfilePath: 'Dockerfile',
      watchPatterns: [
        'src/**',
        'web/**',
        'prisma/**',
        'assets/**',
        'package*.json',
        'Dockerfile',
        'tsconfig.json',
        'prisma.config.ts',
      ],
    },
    deploy: {
      startCommand: 'node dist/src/worker.js',
    },
    replicas: { 'us-east4-eqdc4a': 1 },
  });

  return project('household-ledger', {
    variables: { managed: false },
    resources: [web, Postgres, worker, postgresVolume],
  });
});
