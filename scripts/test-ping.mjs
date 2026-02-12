#!/usr/bin/env node

/**
 * Ping Plugin Test Script
 *
 * Tests the Ping plugin sound notification hooks.
 * Verifies that the notify.sh script runs correctly on the current platform.
 */

import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message) {
  console.log(message);
}

// Safe command execution with promises
function execFileSafe(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Platform detection
function detectPlatform() {
  const platform = process.platform;
  if (platform === 'darwin') return { name: 'macOS', command: 'afplay', systemSound: '/System/Library/Sounds/Glass.aiff' };
  if (platform === 'linux') return { name: 'Linux', command: 'paplay|aplay', systemSound: null };
  if (platform === 'win32') return { name: 'Windows', command: 'powershell', systemSound: null };
  return { name: 'Unknown', command: null, systemSound: null };
}

// Check if sound command is available
async function checkSoundCommand(platform) {
  if (!platform.command) return false;

  try {
    if (platform.name === 'macOS') {
      await execFileSafe('which', ['afplay'], { stdio: 'ignore' });
      return true;
    } else if (platform.name === 'Linux') {
      try {
        await execFileSafe('which', ['paplay'], { stdio: 'ignore' });
        return true;
      } catch {
        try {
          await execFileSafe('which', ['aplay'], { stdio: 'ignore' });
          return true;
        } catch {
          return false;
        }
      }
    } else if (platform.name === 'Windows') {
      await execFileSafe('where', ['powershell'], { stdio: 'ignore' });
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

// Test notify.sh script
async function testNotifyScript() {
  const notifyScript = join(__dirname, '..', 'plugins', 'ping', 'scripts', 'notify.sh');

  log('\n' + '='.repeat(60));
  log('Ping Plugin Test Script');
  log('='.repeat(60));

  // Check if notify.sh exists
  if (!existsSync(notifyScript)) {
    log(colorize('red', '❌ notify.sh not found at: ' + notifyScript));
    return false;
  }
  log(colorize('green', '✅ notify.sh found at: ' + notifyScript));

  // Check if it's executable
  try {
    await execFileSafe('test', ['-x', notifyScript], { stdio: 'ignore' });
    log(colorize('green', '✅ notify.sh is executable'));
  } catch {
    log(colorize('yellow', '⚠️  notify.sh is not executable, fixing...'));
    try {
      await execFileSafe('chmod', ['+x', notifyScript], { stdio: 'ignore' });
      log(colorize('green', '✅ Made notify.sh executable'));
    } catch {
      log(colorize('red', '❌ Could not make notify.sh executable'));
      return false;
    }
  }

  // Detect platform
  const platform = detectPlatform();
  log(colorize('cyan', `\n📱 Platform: ${platform.name}`));
  log(`   Sound command: ${platform.command || 'none'}`);

  // Check sound command availability
  const soundAvailable = await checkSoundCommand(platform);
  if (soundAvailable) {
    log(colorize('green', `✅ Sound command available: ${platform.command}`));
  } else {
    log(colorize('yellow', `⚠️  Sound command not found: ${platform.command}`));
    log(`   Sounds will not play, but the hook will still execute without errors`);
  }

  // Check for system sounds on macOS
  if (platform.name === 'macOS') {
    const systemSound = platform.systemSound;
    if (existsSync(systemSound)) {
      log(colorize('green', `✅ System sound fallback available: ${systemSound}`));
    } else {
      log(colorize('yellow', `⚠️  System sound not found: ${systemSound}`));
    }
  }

  // Test each hook type
  log('\n' + '-'.repeat(60));
  log('Testing Hook Types');
  log('-'.repeat(60));

  const hookTypes = ['session-start', 'user-prompt', 'notification', 'stop'];
  const results = [];

  for (const hookType of hookTypes) {
    log(`\n🔔 Testing: ${hookType}`);

    try {
      // Set CLAUDE_PLUGIN_ROOT for the script
      const env = {
        ...process.env,
        CLAUDE_PLUGIN_ROOT: join(__dirname, '..', 'plugins', 'ping'),
        PING_ENABLED: 'true'
      };

      // Run the notify script with the hook type
      await execFileSafe(notifyScript, [hookType], {
        stdio: 'pipe',
        env: env,
        timeout: 5000
      });

      log(colorize('green', `   ✅ ${hookType} hook executed successfully`));
      results.push({ hook: hookType, success: true });
    } catch (error) {
      log(colorize('red', `   ❌ ${hookType} hook failed: ${error.message}`));
      results.push({ hook: hookType, success: false, error: error.message });
    }
  }

  // Summary
  log('\n' + '='.repeat(60));
  log('Test Summary');
  log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => r.success === false).length;

  log(`Total tests: ${results.length}`);
  log(colorize('green', `✅ Passed: ${successful}`));
  if (failed > 0) {
    log(colorize('red', `❌ Failed: ${failed}`));
    return false;
  }

  log('\n' + colorize('green', '🎉 All tests passed!'));

  // Next steps
  log('\n' + '-'.repeat(60));
  log('Next Steps');
  log('-'.repeat(60));
  log('1. Add custom sound files to: plugins/ping/sounds/');
  log('   - session-start.wav');
  log('   - user-prompt.wav');
  log('   - notification.wav');
  log('   - stop.wav');
  log('\n2. Or configure in ~/.claude/settings.json:');
  log('   "PING_SOUNDS_DIR": "${CLAUDE_PLUGIN_ROOT}/sounds"');
  log('   "PING_SOUND_SESSION_START": "MySound.wav"');
  log('   "PING_SOUND_USER_PROMPT": ""          (empty to disable)');
  log('\n3. Test with actual sound playback:');
  log(`   CLAUDE_PLUGIN_ROOT=plugins/ping ${notifyScript} notification`);

  return true;
}

// Run tests
testNotifyScript()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
