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
        const cleanFolder = folderName.replace(/\/+$/, '');
        const deletedIds = new Set<string>();

        // Method 1: Modern Cloudinary Asset Folder Deletion (Matches UI folder)
        try {
            const resA: any = await (cloudinary.api as any).delete_resources_by_asset_folder(cleanFolder);
            const deletedA = resA.deleted || {};
            Object.keys(deletedA).forEach(id => deletedIds.add(id));
        } catch (err: any) {
            console.warn('delete_resources_by_asset_folder note:', err.message);
        }

        // Method 2: Public ID Prefix Deletion with slash ("folder/")
        try {
            const resB: any = await cloudinary.api.delete_resources_by_prefix(`${cleanFolder}/`);
            const deletedB = resB.deleted || {};
            Object.keys(deletedB).forEach(id => deletedIds.add(id));
        } catch (err: any) {
            console.warn('delete_resources_by_prefix(slash) note:', err.message);
        }

        // Method 3: Public ID Prefix Deletion without slash ("folder")
        try {
            const resC: any = await cloudinary.api.delete_resources_by_prefix(cleanFolder);
            const deletedC = resC.deleted || {};
            Object.keys(deletedC).forEach(id => deletedIds.add(id));
        } catch (err: any) {
            console.warn('delete_resources_by_prefix(no-slash) note:', err.message);
        }

        // Method 4: Tag-based Deletion
        try {
            const resD: any = await cloudinary.api.delete_resources_by_tag(cleanFolder);
            const deletedD = resD.deleted || {};
            Object.keys(deletedD).forEach(id => deletedIds.add(id));
        } catch (err: any) {
            console.warn('delete_resources_by_tag note:', err.message);
        }

        return deletedIds.size;
    } catch (error) {
        console.error('Cloudinary Folder Delete Error:', error);
        throw error;
    }
};
