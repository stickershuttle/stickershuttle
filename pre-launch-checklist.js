#!/usr/bin/env node

/**
 * Pre-Launch Verification Script
 * 
 * This script verifies all critical components are ready for production launch
 * Run this before switching your domain from Shopify to the new site
 */

const https = require('https');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Configuration
const config = {
  domain: 'stickershuttle.com',
  apiUrl: 'https://ss-beyond.up.railway.app',
  frontendUrl: 'https://stickershuttle.vercel.app', // Vercel preview URL
  requiredEnvVars: {
    frontend: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
      'NEXT_PUBLIC_POSTHOG_KEY',
      'NEXT_PUBLIC_API_URL'
    ],
    backend: [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'EASYPOST_API_KEY',
      'CLOUDINARY_CLOUD_NAME',
      'RESEND_API_KEY',
      'NODE_ENV'
    ]
  }
};

class PreLaunchChecker {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      checks: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const symbols = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const colorMap = {
      success: colors.green,
      error: colors.red,
      warning: colors.yellow,
      info: colors.blue
    };

    console.log(`${colorMap[type]}${symbols[type]} ${message}${colors.reset}`);
  }

  async checkUrl(url, description) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      https.get(url, (res) => {
        const responseTime = Date.now() - startTime;
        
        if (res.statusCode === 200) {
          this.log(`${description} - Status: ${res.statusCode}, Response: ${responseTime}ms`, 'success');
          this.results.passed++;
          resolve(true);
        } else {
          this.log(`${description} - Status: ${res.statusCode}`, 'error');
          this.results.failed++;
          resolve(false);
        }
      }).on('error', (err) => {
        this.log(`${description} - Error: ${err.message}`, 'error');
        this.results.failed++;
        resolve(false);
      });
    });
  }

  async checkDNS(domain) {
    try {
      const { stdout } = await execAsync(`nslookup ${domain}`);
      
      if (stdout.includes('76.76.21.21') || stdout.includes('cname.vercel-dns.com')) {
        this.log(`DNS for ${domain} points to Vercel`, 'success');
        this.results.passed++;
        return true;
      } else {
        this.log(`DNS for ${domain} may not be configured for Vercel yet`, 'warning');
        this.results.warnings++;
        return false;
      }
    } catch (error) {
      this.log(`DNS check failed for ${domain}: ${error.message}`, 'error');
      this.results.failed++;
      return false;
    }
  }

  async checkSSL(domain) {
    const url = `https://${domain}`;
    return new Promise((resolve) => {
      https.get(url, (res) => {
        if (res.socket.authorized) {
          this.log(`SSL certificate valid for ${domain}`, 'success');
          this.results.passed++;
          resolve(true);
        } else {
          this.log(`SSL certificate issue for ${domain}`, 'error');
          this.results.failed++;
          resolve(false);
        }
      }).on('error', (err) => {
        this.log(`SSL check failed for ${domain}: ${err.message}`, 'error');
        this.results.failed++;
        resolve(false);
      });
    });
  }

  async checkBuildStatus() {
    try {
      // Check if we can build the frontend
      const { stdout } = await execAsync('cd frontend && npm run build', { timeout: 120000 });
      
      if (stdout.includes('Build completed') || stdout.includes('Export completed')) {
        this.log('Frontend build successful', 'success');
        this.results.passed++;
        return true;
      } else {
        this.log('Frontend build completed but check output manually', 'warning');
        this.results.warnings++;
        return false;
      }
    } catch (error) {
      this.log(`Frontend build failed: ${error.message}`, 'error');
      this.results.failed++;
      return false;
    }
  }

  async checkStripeWebhook() {
    // This is a placeholder - in reality you'd check Stripe dashboard
    this.log('⚠️ MANUAL CHECK: Verify Stripe webhook endpoint is set to production URL', 'warning');
    this.results.warnings++;
  }

  async checkEasyPostMode() {
    // This is a placeholder - in reality you'd check the Railway environment
    this.log('⚠️ MANUAL CHECK: Verify EASYPOST_TEST_MODE=false in Railway dashboard', 'warning');
    this.results.warnings++;
  }

  async checkSupabaseEdgeFunctions() {
    try {
      // This is a simplified check
      this.log('⚠️ MANUAL CHECK: Verify Supabase edge functions are deployed', 'warning');
      this.results.warnings++;
    } catch (error) {
      this.log(`Supabase check failed: ${error.message}`, 'error');
      this.results.failed++;
    }
  }

  async runAllChecks() {
    this.log(`${colors.bold}🚀 Pre-Launch Verification Started${colors.reset}`, 'info');
    this.log('=' .repeat(50), 'info');

    // 1. Check API endpoints
    this.log('\n📡 Checking API Endpoints...', 'info');
    await this.checkUrl(`${config.apiUrl}/health`, 'API Health Check');
    await this.checkUrl(`${config.apiUrl}/graphql`, 'GraphQL Endpoint');

    // 2. Check frontend build
    this.log('\n🔨 Checking Frontend Build...', 'info');
    await this.checkBuildStatus();

    // 3. Check DNS configuration (warning if not ready)
    this.log('\n🌐 Checking DNS Configuration...', 'info');
    await this.checkDNS(config.domain);
    await this.checkDNS(`www.${config.domain}`);

    // 4. Check SSL (only if DNS is ready)
    this.log('\n🔒 Checking SSL Certificates...', 'info');
    // await this.checkSSL(config.domain);

    // 5. Manual checks
    this.log('\n⚠️ Manual Verification Required:', 'info');
    await this.checkStripeWebhook();
    await this.checkEasyPostMode();
    await this.checkSupabaseEdgeFunctions();

    // 6. Final summary
    this.log('\n' + '=' .repeat(50), 'info');
    this.log(`${colors.bold}Pre-Launch Verification Complete${colors.reset}`, 'info');
    this.log(`✅ Passed: ${this.results.passed}`, 'success');
    this.log(`❌ Failed: ${this.results.failed}`, 'error');
    this.log(`⚠️ Warnings: ${this.results.warnings}`, 'warning');

    if (this.results.failed > 0) {
      this.log('\n❌ CRITICAL ISSUES FOUND - DO NOT LAUNCH YET', 'error');
      process.exit(1);
    } else if (this.results.warnings > 0) {
      this.log('\n⚠️ WARNINGS FOUND - REVIEW MANUAL CHECKS BEFORE LAUNCH', 'warning');
    } else {
      this.log('\n🎉 ALL CHECKS PASSED - READY FOR LAUNCH!', 'success');
    }

    // Launch readiness recommendations
    this.log('\n📋 Pre-Launch Recommendations:', 'info');
    this.log('1. Export Shopify data (orders, customers, products)', 'info');
    this.log('2. Backup current Supabase database', 'info');
    this.log('3. Update Stripe webhook URL to production', 'info');
    this.log('4. Set EASYPOST_TEST_MODE=false in Railway', 'info');
    this.log('5. Verify all environment variables in Vercel and Railway', 'info');
    this.log('6. Plan for 15-30 minute downtime window', 'info');
    this.log('7. Have rollback plan ready (DNS revert)', 'info');

    this.log('\n🚀 Ready to launch? Run the DNS switch in GoDaddy!', 'info');
  }
}

// Execute the checks
const checker = new PreLaunchChecker();
checker.runAllChecks().catch(console.error); 