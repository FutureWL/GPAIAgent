module.exports = {
  apps: [
    {
      name: 'gpaiagent-prod-api',
      cwd: '/home/weilai/apps/gpaia-agent-prod',
      script: 'node',
      args: 'apps/api/dist/main',
      wait_ready: true,
      kill_timeout: 5000,
      out_file: '/home/weilai/logs/gpaiagent-prod-api-out.log',
      error_file: '/home/weilai/logs/gpaiagent-prod-api-err.log',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/gpaiagent_prod?schema=public',
        JWT_ACCESS_SECRET: 'CHANGE_ME_IN_PROD',
        JWT_REFRESH_SECRET: 'CHANGE_ME_IN_PROD',
        WEB_ORIGIN: 'http://localhost:3001',
      },
    },
    {
      name: 'gpaiagent-prod-web',
      cwd: '/home/weilai/apps/gpaia-agent-prod/apps/web',
      script: './node_modules/.bin/next',
      args: 'start',
      interpreter: '/bin/sh',
      wait_ready: true,
      kill_timeout: 5000,
      out_file: '/home/weilai/logs/gpaiagent-prod-web-out.log',
      error_file: '/home/weilai/logs/gpaiagent-prod-web-err.log',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        NEXT_PUBLIC_API_URL: 'http://localhost:3002',
      },
    },
  ],
};
