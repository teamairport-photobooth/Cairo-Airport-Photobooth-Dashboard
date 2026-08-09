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
        const publicIdsSet = new Set<string>();

        // 1. List assets in asset folder via standard Free Admin API (resources_by_asset_folder)
        try {
            let nextCursor: string | undefined = undefined;
            do {
                const res: any = await (cloudinary.api as any).resources_by_asset_folder(cleanFolder, {
                    max_results: 500,
                    next_cursor: nextCursor
                });
                (res.resources || []).forEach((r: any) => publicIdsSet.add(r.public_id));
                nextCursor = res.next_cursor;
            } while (nextCursor);
        } catch (err: any) {
            console.warn('resources_by_asset_folder note:', err.message);
        }

        // 2. List assets by public_id prefix (folder/ and folder) via standard Free Admin API
        for (const prefix of [`${cleanFolder}/`, cleanFolder]) {
            try {
                let nextCursor: string | undefined = undefined;
                do {
                    const res: any = await cloudinary.api.resources({
                        type: 'upload',
                        prefix: prefix,
                        max_results: 500,
                        next_cursor: nextCursor
                    });
                    (res.resources || []).forEach((r: any) => publicIdsSet.add(r.public_id));
                    nextCursor = res.next_cursor;
                } while (nextCursor);
            } catch (err: any) {
                // Ignore prefix lookup note
            }
        }

        // 3. List assets by tag via standard Free Admin API
        try {
            let nextCursor: string | undefined = undefined;
            do {
                const res: any = await cloudinary.api.resources_by_tag(cleanFolder, {
                    max_results: 500,
                    next_cursor: nextCursor
                });
                (res.resources || []).forEach((r: any) => publicIdsSet.add(r.public_id));
                nextCursor = res.next_cursor;
            } while (nextCursor);
        } catch (err: any) {
            // Ignore tag lookup note
        }

        const publicIds = Array.from(publicIdsSet);
        let totalDeleted = 0;

        // 4. Batch delete all discovered assets via standard Free Admin API (delete_resources)
        if (publicIds.length > 0) {
            const chunkSize = 100;
            for (let i = 0; i < publicIds.length; i += chunkSize) {
                const chunk = publicIds.slice(i, i + chunkSize);
                try {
                    const deleteRes: any = await cloudinary.api.delete_resources(chunk);
                    const deletedMap = deleteRes.deleted || {};
                    totalDeleted += Object.keys(deletedMap).length;
                } catch (err) {
                    console.error('Error deleting chunk:', err);
                }
            }
        }

        return totalDeleted;
    } catch (error) {
        console.error('Cloudinary Folder Delete Error:', error);
        throw error;
    }
};

export const deleteCloudinaryImages = async (
    cloudName: string,
    apiKey: string,
    apiSecret: string,
    publicIds: string[]
) => {
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });

    try {
        let totalDeleted = 0;
        const chunkSize = 100;
        for (let i = 0; i < publicIds.length; i += chunkSize) {
            const chunk = publicIds.slice(i, i + chunkSize);
            try {
                const deleteRes: any = await cloudinary.api.delete_resources(chunk);
                const deletedMap = deleteRes.deleted || {};
                totalDeleted += Object.keys(deletedMap).length;
            } catch (err) {
                console.error('Error deleting chunk of images:', err);
                throw err;
            }
        }
        return totalDeleted;
    } catch (error) {
        console.error('Cloudinary Images Delete Error:', error);
        throw error;
    }
};

