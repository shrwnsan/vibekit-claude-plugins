#!/usr/bin/env node

/**
 * Search-Plus Plugin Status Check
 *
 * Lightweight script to quickly check if search-plus plugin is installed.
 * Only outputs to terminal - no file writing.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Claude plugin directories
const claudePluginsDir = join(homedir(), '.claude', 'plugins');
const claudeMarketplacesDir = join(claudePluginsDir, 'marketplaces');
const claudeReposDir = join(claudePluginsDir, 'repos');

// Plugin file checking
function checkPluginFiles() {
  const localPluginDir = join(__dirname, '..', 'plugins', 'search-plus');

  return {
    localExists: existsSync(localPluginDir),
    hasManifest: existsSync(join(localPluginDir, '.claude-plugin', 'plugin.json')),
    hasSkill: existsSync(join(localPluginDir, 'skills', 'search-plus', 'SKILL.md')),
    hasHooks: existsSync(join(localPluginDir, 'hooks'))
  };
}

// Check Claude's settings.json for definitive plugin installation status
function checkClaudeInstallation() {
  const settingsPath = join(homedir(), '.claude', 'settings.json');

  const result = {
    settingsFileExists: existsSync(settingsPath),
    searchPlusEnabled: false,
    pluginName: null,
    enabledPlugins: {},
    error: null
  };

  if (!result.settingsFileExists) {
    result.error = 'Settings file not found';
    return result;
  }

  try {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    result.enabledPlugins = settings.enabledPlugins || {};

    // Check for various possible plugin names
    const pluginNames = ['search-plus@vibekit', 'search-plus', 'search-plus@local-marketplace', 'search-plus@shrwnsan-plugins'];

    for (const name of pluginNames) {
      if (result.enabledPlugins[name] === true) {
        result.searchPlusEnabled = true;
        result.pluginName = name;
        break;
      }
    }
  } catch (error) {
    result.error = `Error reading settings: ${error.message}`;
  }

  return result;
}

// Command availability check - verify command file exists in marketplace installation
function checkCommandAvailability() {
  const marketplaceCommandPath = join(homedir(), '.claude', 'plugins', 'marketplaces', 'vibekit', 'plugins', 'search-plus', 'commands', 'search-plus.md');

  const result = {
    commandFileExists: existsSync(marketplaceCommandPath),
    commandPath: marketplaceCommandPath,
    commandAvailable: false
  };

  result.commandAvailable = result.commandFileExists;

  return result;
}

// Main status check function
function runQuickStatusCheck() {
  console.log('🔍 Search-Plus Plugin Status');
  console.log('='.repeat(50));

  const localFiles = checkPluginFiles();
  const claudeInstallation = checkClaudeInstallation();
  const commandStatus = checkCommandAvailability();

  // Determine overall status using settings.json as definitive source
  const pluginReady = localFiles.localExists && localFiles.hasManifest && localFiles.hasSkill;
  const pluginInstalled = claudeInstallation.searchPlusEnabled;

  // Overall status
  let status, emoji, color;

  if (pluginReady && pluginInstalled) {
    status = 'FULLY_OPERATIONAL';
    emoji = '🟢';
    color = 'green';
  } else if (pluginReady) {
    status = 'READY_TO_INSTALL';
    emoji = '🟡';
    color = 'yellow';
  } else {
    status = 'NOT_READY';
    emoji = '🔴';
    color = 'red';
  }

  // Local files status
  console.log('\n📁 Local Files:');
  console.log(`   Source Directory: ${localFiles.localExists ? '✅' : '❌'}`);
  console.log(`   Plugin Manifest: ${localFiles.hasManifest ? '✅' : '❌'}`);
  console.log(`   Skill File: ${localFiles.hasSkill ? '✅' : '❌'}`);
  console.log(`   Hooks Directory: ${localFiles.hasHooks ? '✅' : '❌'}`);

  // Claude installation status
  console.log('\n🔧 Claude Installation:');
  console.log(`   Settings file: ${claudeInstallation.settingsFileExists ? '✅' : '❌'}`);
  console.log(`   Plugin enabled: ${claudeInstallation.searchPlusEnabled ? '✅' : '❌'}`);
  if (claudeInstallation.pluginName) {
    console.log(`   Plugin name: ${claudeInstallation.pluginName}`);
  }
  console.log(`   Command file: ${commandStatus.commandAvailable ? '✅' : '❌'}`);

  // Overall status
  console.log('\n🎯 Overall Status:');
  console.log(`   Status: ${emoji} ${status}`);
  console.log(`   Ready: ${pluginReady ? '✅' : '❌'}`);
  console.log(`   Installed: ${pluginInstalled ? '✅' : '❌'}`);

  // Quick recommendations
  console.log('\n💡 Quick Status:');

  if (!pluginReady) {
    console.log('❌ Plugin files incomplete - check project structure');
  } else if (!pluginInstalled) {
    console.log('📦 Install plugin: claude plugin install search-plus@vibekit');
  } else {
    console.log('🎉 Plugin is fully operational!');
  }

  // Show detailed settings info if there's an error
  if (claudeInstallation.error) {
    console.log('\n⚠️  Settings Error:', claudeInstallation.error);
  }

  // Return complete status for other scripts to use
  return {
    status,
    emoji,
    color,
    pluginReady,
    pluginInstalled,
    localFiles,
    claudeInstallation,
    commandStatus,
    summary: {
      overallStatus: pluginReady && claudeInstallation.searchPlusEnabled ? 'FULLY_OPERATIONAL' :
                     pluginReady ? 'READY_TO_INSTALL' : 'NOT_READY',
      pluginReady,
      pluginInstalled: claudeInstallation.searchPlusEnabled,
      pluginName: claudeInstallation.pluginName
    }
  };
}

// Run status check if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runQuickStatusCheck();
}

export { runQuickStatusCheck, checkPluginFiles, checkClaudeInstallation, checkCommandAvailability };