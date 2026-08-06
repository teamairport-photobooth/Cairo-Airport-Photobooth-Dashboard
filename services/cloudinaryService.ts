import { v2 as cloudinary } from 'cloudinary';

// Server-side service for Cloudinary Admin operations

export const getCloudinaryImagesByTag = async (cloudName: string, apiKey: string, apiSecret: string, tag: string) => {
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });

    try {
        const result = await cloudinary.api.resources_by_tag(tag, {
            max_results: 50,
            context: true
        });
        return result.resources;
    } catch (error) {
        console.error('Cloudinary SDK Error:', error);
        throw error;
    }
};

export const deleteCloudinaryFolderImages = async (cloudName: string, apiKey: string, apiSecret: string, folderName: string) => {
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });

    try {
        let totalDeleted = 0;
        const cleanFolder = folderName.replace(/\/+$/, ''); // e.g. "cairo-airport-photobooth"

        // 1. Delete all resources stored under the folder prefix
        const prefixesToTry = [cleanFolder, `${cleanFolder}/`];

        for (const prefix of prefixesToTry) {
            let hasMore = true;
            while (hasMore) {
                const result = await cloudinary.api.delete_resources_by_prefix(prefix, {
                    resource_type: 'image',
                    type: 'upload'
                });
                const deletedMap = result.deleted || {};
                const count = Object.keys(deletedMap).length;
                totalDeleted += count;

                if (count === 0 || !result.partial) {
                    hasMore = false;
                }
            }
        }

        // 2. Also attempt deletion by tag in case assets were tagged with the folder name
        try {
            const tagResult = await cloudinary.api.delete_resources_by_tag(cleanFolder);
            const tagDeletedMap = tagResult.deleted || {};
            const count = Object.keys(tagDeletedMap).length;
            totalDeleted += count;
        } catch (err) {
            // Tag delete throws if no resources match tag, safe to ignore
        }

        return totalDeleted;
    } catch (error) {
        console.error('Cloudinary Folder Delete Error:', error);
        throw error;
    }
};
