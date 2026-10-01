import {
    createShopService,
    deleteShopService,
    getShopByIdService,
    getShopBySellerIdService,
    getShopBySlugService,
    listShopsService,
    updateShopService,
    updateShopStatusService,
} from "./shop.service.js";

import {
    createShopSchema,
    shopIdSchema,
    shopListQuerySchema,
    shopSlugSchema,
    updateShopSchema,
    updateShopStatusSchema,
} from "./shop.validation.js";

export const createShop = async (req, res) => {
    const { sellerId, ...shopBody } = req.body;

    const data = createShopSchema.parse(shopBody);

    let shopOwnerId;

    if (req.user.role === "super_admin") {
        if (!sellerId) {
            const error = new Error(
                "Seller ID is required when Super Admin creates a shop",
            );

            error.statusCode = 400;

            throw error;
        }

        shopOwnerId = sellerId;
    } else {
        shopOwnerId = req.user.id;
    }

    const shop = await createShopService({
        sellerId: shopOwnerId,
        shopData: data,
        actorId: req.user.id,
        actorRole: req.user.role,
    });

    return res.status(201).json({
        success: true,
        message: "Shop created successfully",
        data: shop,
    });
};

export const getShops = async (req, res) => {
    const query = shopListQuerySchema.parse(req.query);

    const result = await listShopsService(query);

    return res.status(200).json({
        success: true,
        message: "Shops fetched successfully",
        data: result.shops,
        pagination: result.pagination,
    });
};

export const getShopById = async (req, res) => {
    const { shopId } = shopIdSchema.parse(req.params);

    const shop = await getShopByIdService(shopId);

    return res.status(200).json({
        success: true,
        message: "Shop fetched successfully",
        data: shop,
    });
};

export const getMyShop = async (req, res) => {
    const shop = await getShopBySellerIdService(
        req.user.id,
    );

    return res.status(200).json({
        success: true,
        message: "Shop fetched successfully",
        data: shop,
    });
};

export const getShopBySlug = async (req, res) => {
    const { slug } = shopSlugSchema.parse(req.params);

    const shop = await getShopBySlugService(slug);

    return res.status(200).json({
        success: true,
        message: "Shop fetched successfully",
        data: shop,
    });
};

export const updateShop = async (req, res) => {
    const { shopId } = shopIdSchema.parse(req.params);

    const data = updateShopSchema.parse(req.body);

    const shop = await updateShopService({
        shopId,
        userId: req.user.id,
        role: req.user.role,
        updateData: data,
    });

    return res.status(200).json({
        success: true,
        message: "Shop updated successfully",
        data: shop,
    });
};

export const deleteShop = async (req, res) => {
    const { shopId } = shopIdSchema.parse(req.params);

    await deleteShopService({
        shopId,
        userId: req.user.id,
        role: req.user.role,
    });

    return res.status(200).json({
        success: true,
        message: "Shop deleted successfully",
        data: null,
    });
};

export const updateShopStatus = async (req, res) => {
    const { shopId } = shopIdSchema.parse(req.params);

    const data = updateShopStatusSchema.parse(req.body);

    const shop = await updateShopStatusService({
        shopId,
        status: data.status,
        reason: data.reason,
        actorId: req.user.id,
    });

    return res.status(200).json({
        success: true,
        message: "Shop status updated successfully",
        data: shop,
    });
};