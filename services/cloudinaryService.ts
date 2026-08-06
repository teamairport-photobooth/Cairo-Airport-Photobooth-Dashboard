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

export const deleteCloudinaryImagesByTag = async (cloudName: string, apiKey: string, apiSecret: string, tag: string) => {
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });

    try {
        let totalDeleted = 0;
        let hasMore = true;

        while (hasMore) {
            const result = await cloudinary.api.delete_resources_by_tag(tag);
            const deletedMap = result.deleted || {};
            const count = Object.keys(deletedMap).length;
            totalDeleted += count;

            if (count === 0 || !result.partial) {
                hasMore = false;
            }
        }

        return totalDeleted;
    } catch (error) {
        console.error('Cloudinary Bulk Delete Error:', error);
        throw error;
    }
};
