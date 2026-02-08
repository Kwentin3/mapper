/**
 * Signal filtering utilities for noise control.
 */

import type { FileSignals, Signal } from './types.js';
import { ORPHAN_FILTER_PATTERNS } from './policies.js';

/**
 * Convert a glob pattern to a RegExp.
 * Supports: *, **, and simple file extensions.
 */
function globToRegex(pattern: string): RegExp {
  // Escape special regex characters except * and ?
  let regexStr = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  
  // Handle ** patterns first (replace with placeholder)
  regexStr = regexStr.replace(/\*\*/g, '___DOUBLESTAR___');
  
  // Convert * to [^/]* (single asterisk)
  regexStr = regexStr.replace(/\*/g, '[^/]*');
  
  // Restore ** patterns (convert placeholder to .*)
  regexStr = regexStr.replace(/___DOUBLESTAR___/g, '.*');
  
  // Convert ? to .
  regexStr = regexStr.replace(/\?/g, '.');
  
  return new RegExp('^' + regexStr + '$');
}

/**
 * Pre-compiled regex patterns for ORPHAN filtering.
 */
const ORPHAN_FILTER_REGEXES = ORPHAN_FILTER_PATTERNS.map(globToRegex);

/**
 * Check if a file path matches any of the ORPHAN filter patterns.
 */
export function matchesOrphanFilter(filePath: string): boolean {
  return ORPHAN_FILTER_REGEXES.some(regex => regex.test(filePath));
}

/**
 * Filter ORPHAN signals from file signals based on showOrphans flag.
 * When showOrphans is false, ORPHAN signals for files matching filter patterns are removed.
 */
export function filterOrphanSignals(
  fileSignals: FileSignals[],
  showOrphans: boolean
): FileSignals[] {
  if (showOrphans) {
    // Show all ORPHAN signals
    return fileSignals;
  }

  return fileSignals.map(fs => {
    // If file matches filter pattern, remove ORPHAN signals
    if (matchesOrphanFilter(fs.file)) {
      return {
        ...fs,
        inline: fs.inline.filter(s => s.code !== 'ORPHAN'),
      };
    }
    return fs;
  });
}
