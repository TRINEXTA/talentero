/**
 * PM2 Ecosystem Configuration - Talentero
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 reload talentero
 *   pm2 logs talentero
 */

module.exports = {
  apps: [
    {
      name: 'talentero',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/talentero',

      // Instances et mode
      instances: 'max', // Utilise tous les CPU disponibles
      exec_mode: 'cluster',

      // Environnement
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },

      // Gestion de la mémoire
      max_memory_restart: '1G',

      // Logs
      log_file: '/var/log/talentero/combined.log',
      out_file: '/var/log/talentero/out.log',
      error_file: '/var/log/talentero/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Redémarrage automatique
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 4000,

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Startup
      min_uptime: '10s',

      // Health check
      exp_backoff_restart_delay: 100,
    }
  ]
};
