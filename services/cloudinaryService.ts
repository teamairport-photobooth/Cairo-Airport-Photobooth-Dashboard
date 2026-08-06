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
        const folderPrefix = folderName.replace(/\/+$/, '') + '/';

        // Delete all resources inside the folder using Cloudinary's direct prefix API
        const result: any = await cloudinary.api.delete_resources_by_prefix(folderPrefix);
        const deletedMap = result.deleted || {};
        return Object.keys(deletedMap).length;
    } catch (error) {
        console.error('Cloudinary Folder Delete Error:', error);
        throw error;
    }
};
