# Crash Investigation - October 10, 2025

## Summary
App crashed after 9.5 hours of runtime with SIGABRT on ThreadPoolServiceThread while running under Rosetta translation.

## Root Cause
**Rosetta Translation Instability** - Running x86_64 build on Apple Silicon via Rosetta, likely triggered by:
- Native module (simple-git) incompatibility with Rosetta
- Resource accumulation from git operations over time
- Thread pool exhaustion

## Crash Details
- **Exception**: EXC_CRASH (SIGABRT)
- **Termination**: Namespace ROSETTA, Code 0
- **Thread**: ThreadPoolServiceThread (#2)
- **Runtime**: ~9.5 hours (started 05:03:12, crashed 14:52:22)
- **App Version**: 0.1.10
- **OS**: macOS 15.5 (24F74) on Apple M1 Pro
- **Architecture**: x86_64 (via Rosetta translation) ⚠️

## Fixes Applied

### 1. Resource Leak Prevention
- Added git instance caching to prevent creating new instances for each operation
- Added cleanup method to properly dispose of git instances on app quit
- Added timeout for update checks (5 minutes) to prevent hanging operations

### 2. Recommended Actions

#### High Priority
1. **Use ARM64 Build**: Ensure users on Apple Silicon use the native arm64 build
   ```bash
   # Check current architecture
   file /Applications/Bottleneck.app/Contents/MacOS/Bottleneck
   ```

2. **Update Electron**: Consider upgrading from v27.3.11 to latest stable
   ```bash
   npm install electron@latest
   ```

3. **Monitor simple-git**: Consider adding process monitoring
   ```typescript
   // In git.ts, add logging for operations
   async clone(repoUrl: string, localPath?: string): Promise<string> {
     console.log(`[Git] Starting clone: ${repoUrl}`);
     try {
       const result = await git.clone(repoUrl, targetPath);
       console.log(`[Git] Clone completed: ${repoUrl}`);
       return result;
     } catch (error) {
       console.error(`[Git] Clone failed: ${repoUrl}`, error);
       throw error;
     }
   }
   ```

#### Medium Priority
1. **Add Crash Reporting**: Integrate Sentry or similar
2. **Add Memory Monitoring**: Track memory usage over time
3. **Add Process Monitoring**: Monitor child processes from simple-git

#### Low Priority
1. **Consider alternative git implementation**: Try using native child_process for git commands
2. **Add health checks**: Periodic memory/resource health checks

## Monitoring Script

To monitor for similar issues, check:
```bash
# Check running architecture
ps aux | grep Bottleneck

# Monitor file descriptors
lsof -p <pid> | wc -l

# Monitor threads
ps -M <pid>

# Check for Rosetta processes
ps aux | grep oahd
```

## Prevention

### Build Configuration
Ensure your build process creates proper universal binaries:
```json
{
  "mac": {
    "target": {
      "target": "default",
      "arch": ["arm64", "x64"]
    }
  }
}
```

### Distribution
Consider distributing separate builds:
- `Bottleneck-arm64.dmg` for Apple Silicon
- `Bottleneck-x64.dmg` for Intel Macs

### Testing
Test both architectures before release:
```bash
# Build and test
npm run dist

# Test arm64
open release/mac-arm64/Bottleneck.app

# Test x64 under Rosetta
arch -x86_64 open release/mac/Bottleneck.app
```

## Related Issues
- Electron running under Rosetta: https://github.com/electron/electron/issues?q=rosetta
- simple-git memory leaks: https://github.com/steveukx/git-js/issues?q=memory

## Next Steps
1. ✅ Apply code fixes (done)
2. ⏳ Rebuild application
3. ⏳ Test for 24+ hours
4. ⏳ Monitor crash reports
5. ⏳ Consider adding telemetry
