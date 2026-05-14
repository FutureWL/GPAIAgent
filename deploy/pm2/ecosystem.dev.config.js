module.exports = {
  apps: [
    {
      name: 'gpaiagent-dev-api',
      cwd: '/home/weilai/apps/gpaia-agent-dev',
      script: 'pnpm',
      args: '--filter @gpaiagent/api dev',
      dotenv: '/home/weilai/apps/gpaia-agent-dev/apps/api/.env.dev',
      wait_ready: true,
      kill_timeout: 5000,
      out_file: '/home/weilai/logs/gpaiagent-dev-api-out.log',
      error_file: '/home/weilai/logs/gpaiagent-dev-api-err.log',
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'gpaiagent-dev-web',
      cwd: '/home/weilai/apps/gpaia-agent-dev',
      script: 'pnpm',
      args: '--filter @gpaiagent/web dev',
      dotenv: '/home/weilai/apps/gpaia-agent-dev/apps/web/.env.dev',
      wait_ready: true,
      kill_timeout: 5000,
      out_file: '/home/weilai/logs/gpaiagent-dev-web-out.log',
      error_file: '/home/weilai/logs/gpaiagent-dev-web-err.log',
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
