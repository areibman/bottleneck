const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context;

    // Only notarize macOS builds
    if (electronPlatformName !== 'darwin') {
        console.log('Skipping notarization (not macOS)');
        return;
    }

    // Check if we have the required credentials
    if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD || !process.env.APPLE_TEAM_ID) {
        console.log('⚠️  Skipping notarization: Missing environment variables');
        console.log('    Required: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID');
        return;
    }

    const appName = context.packager.appInfo.productFilename;
    const appPath = `${appOutDir}/${appName}.app`;

    console.log(`🍎 Notarizing ${appName}...`);
    console.log(`   App path: ${appPath}`);
    console.log(`   Team ID: ${process.env.APPLE_TEAM_ID}`);

    try {
        await notarize({
            appBundleId: 'com.bottleneck.app',
            appPath: appPath,
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
            teamId: process.env.APPLE_TEAM_ID,
        });

        console.log('✅ Notarization complete!');
    } catch (error) {
        console.error('❌ Notarization failed:', error);
        throw error;
    }
};

